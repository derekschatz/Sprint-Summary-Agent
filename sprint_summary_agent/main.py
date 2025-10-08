"""Sprint Summary Agent - Main entry point."""

import sys

from .jira_client import JiraClient
from .llm_recommendations import LLMRecommendationsGenerator
from .output_generator import OutputGenerator
from .powerpoint_generator import PowerPointGenerator
from .settings import load_settings
from .sprint_data_collector import SprintDataCollector


def main():
    """Main execution function."""
    print("🚀 Sprint Summary Agent Starting...\n")

    try:
        # Load and validate configuration
        print("📋 Loading configuration...")
        settings = load_settings()
        project_keys = settings.get_project_keys()
        team_labels = settings.get_team_labels()

        print("✅ Configuration loaded successfully")
        print(f"   Projects: {', '.join(project_keys)}")
        team_display = ", ".join(team_labels) if team_labels else "None (latest sprint per project)"
        print(f"   Teams: {team_display}\n")

        # Initialize Jira client
        print("🔗 Connecting to Jira...")
        jira_client = JiraClient(settings.get_jira_config())
        print(f"✅ Connected to {settings.jira_host}\n")

        # Initialize components
        data_collector = SprintDataCollector(jira_client)
        output_generator = OutputGenerator()
        llm_config = settings.get_llm_config()
        llm_recommendations = LLMRecommendationsGenerator(
            llm_config["provider"],
            llm_config["api_key"],
            llm_config["model"],
        )

        # Collect sprint data for all projects and teams
        data_description = "all projects and teams" if team_labels else "latest sprint per project"
        print(f"📊 Collecting sprint data for {data_description}...")
        all_sprint_data = data_collector.collect_all_sprint_data(project_keys, team_labels)
        entity_type = "team(s)" if team_labels else "project(s)"
        print(f"✅ Collected data for {len(all_sprint_data)} {entity_type}\n")

        if not all_sprint_data:
            print("⚠️  No sprint data found for any project/team combination")
            return

        # Process each team's sprint data
        all_summaries = []
        all_metrics = []
        report_type = "team reports" if team_labels else "project reports"
        print(f"🔄 Processing individual {report_type}...\n")

        for sprint_data in all_sprint_data:
            team_label = sprint_data.get("teamLabel") or "All Teams"
            project_key = sprint_data["projectKey"]

            print(f"\n📈 Processing: {project_key} - {team_label}")
            print("─" * 60)

            # Calculate metrics
            metrics = data_collector.calculate_metrics(sprint_data)

            # Analyze sprint health
            health_analysis = data_collector.analyze_sprint_health(metrics)
            print(f"   Health: {health_analysis['overallHealth']}")

            # Extract key data
            accomplishments = data_collector.extract_accomplishments(metrics, sprint_data["issues"])
            blockers = data_collector.extract_blockers(metrics)

            # Generate recommendations using LLM
            print("   🤖 Generating AI recommendations...")
            team_info = {"label": sprint_data.get("teamLabel")}
            sprint_info = sprint_data["sprint"]
            project_info = sprint_data["project"]

            recommendations = llm_recommendations.generate_recommendations(
                metrics,
                health_analysis,
                sprint_info,
                project_info,
                team_info,
                blockers,
                accomplishments,
            )

            # Generate summary
            summary = output_generator.generate_summary(
                sprint_data,
                metrics,
                health_analysis,
                accomplishments,
                blockers,
                recommendations,
            )

            all_summaries.append(summary)
            all_metrics.append(metrics)

            # Save team-specific outputs
            output_generator.save_json(summary, settings.output_dir)
            output_generator.save_markdown(summary, settings.output_dir)

            print(f"   ✅ Completed: {metrics['completedIssues']}/{metrics['totalIssues']} issues")
            print(f"   ✅ Velocity: {metrics['completedStoryPoints']}/{metrics['totalStoryPoints']} points")

        print("\n" + "═" * 60)
        summary_title = "ALL TEAMS SUMMARY" if team_labels else "ALL PROJECTS SUMMARY"
        print(f"📊 {summary_title}")
        print("═" * 60)

        # Print summary table
        for summary in all_summaries:
            team = summary["teamInfo"]["label"]
            project = summary["projectInfo"]["key"]
            health = summary["sprintHealthAnalysis"]["overallHealth"]
            completion = summary["sprintHealthMetrics"]["completionRate"]
            velocity = summary["sprintHealthMetrics"]["velocity"]

            print(f"{project.ljust(15)} | {team.ljust(20)} | {health.ljust(8)} | Completion: {str(completion).ljust(6)} | Velocity: {velocity}")

        # Generate combined summary if configured
        if settings.generate_combined_summary and len(all_summaries) > 1:
            combined_type = "all teams" if team_labels else "all projects"
            print(f"\n📊 Generating combined summary across {combined_type}...")
            combined_summary = output_generator.generate_combined_summary(all_summaries)
            output_generator.save_combined_summary(combined_summary, settings.output_dir)
            print("✅ Combined summary generated")

        # Generate PowerPoint presentation with LLM-powered content
        print("\n📊 Generating PowerPoint presentation...")
        ppt_generator = PowerPointGenerator(
            llm_config["provider"],
            llm_config["api_key"],
            llm_config["model"],
        )
        ppt_generator.generate_presentation(all_summaries, all_sprint_data, all_metrics, settings.output_dir)
        print("✅ PowerPoint presentation generated")

        print("\n" + "═" * 60)
        print("✨ Sprint Summary Agent completed successfully!")
        report_count = "team report(s)" if team_labels else "project report(s)"
        print(f"   Generated {len(all_summaries)} {report_count}")
        print(f"   Output directory: {settings.output_dir}")
        print("═" * 60)

    except Exception as error:
        print(f"\n❌ Error: {error}")
        import traceback
        print("\nStack trace:")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
