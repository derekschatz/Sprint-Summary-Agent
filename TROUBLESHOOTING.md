# PowerPoint File Troubleshooting Guide

## Current Status

I've created a **simplified, highly compatible** PowerPoint file that:
- ✅ Validates correctly in python-pptx
- ✅ Has proper ZIP/OOXML structure
- ✅ Uses standard slide layouts (Title Slide + Blank)
- ✅ Contains only basic textboxes (no complex shapes)
- ✅ Has 5 slides (1 title + 4 team slides)
- ✅ File size: 34KB

## What I've Tried

### Version 1 (Original - With Shapes)
- Used `MSO_SHAPE.ROUNDED_RECTANGLE` and `MSO_SHAPE.OVAL`
- Added borders, fills, and rounded corners
- **Result**: File generated but couldn't open in your PowerPoint

### Version 2 (Current - Text Only)
- Uses only `add_textbox()` - no shapes
- Uses standard Title Slide layout for first slide
- Uses Blank layout for team slides
- Only colored text (no borders or fills)
- **Result**: File validates but you still can't open it

## Possible Causes

Since the file structure is valid and python-pptx can read it, the issue might be:

1. **PowerPoint Version Compatibility**
   - Some older PowerPoint versions have issues with python-pptx generated files
   - Especially PowerPoint 2013 or older

2. **macOS PowerPoint (Microsoft 365)**
   - Sometimes has stricter validation than Windows version
   - May reject files with minor XML inconsistencies

3. **Application-Specific Issue**
   - Keynote (macOS) might have different compatibility
   - LibreOffice Impress might work better

## Recommended Next Steps

### Option 1: Try Different Applications

```bash
# Try opening with LibreOffice (if installed)
open -a "LibreOffice" output/sprint-summary-presentation.pptx

# Try opening with Google Slides
# Upload to Google Drive, then open with Google Slides
```

### Option 2: Convert Using LibreOffice

If you have LibreOffice installed:

```bash
# Convert to older format
soffice --headless --convert-to ppt output/sprint-summary-presentation.pptx --outdir output/

# Then try opening the .ppt file
open output/sprint-summary-presentation.ppt
```

### Option 3: Use PDF Export

Since the JSON and Markdown exports work perfectly, you could:

1. Use the markdown files for sharing
2. Or convert to PDF for presentation purposes:

```bash
# If you have pandoc installed
pandoc output/sprint-summary-combined.md -o output/sprint-summary.pdf

# If you have wkhtmltopdf
markdown output/sprint-summary-combined.md | wkhtmltopdf - output/sprint-summary.pdf
```

### Option 4: Check PowerPoint Error

When you try to open the file, what exact error message do you see?

Common errors:
- "PowerPoint found a problem with content" → XML validation issue
- "This file is corrupted" → Possible file transfer issue
- "File format not supported" → Version compatibility issue
- No error, just won't open → Application crash

### Option 5: Re-download or Re-generate

Sometimes files get corrupted during download:

```bash
# Delete and regenerate
rm output/sprint-summary-presentation.pptx
python -m sprint_summary_agent.main
```

## File Information

**Location**: `output/sprint-summary-presentation.pptx`

**Contents**:
- Slide 1: Title slide with project/team info
- Slide 2: Team lyra summary (Health: Poor)
- Slide 3: Team aquila summary (Health: Fair)
- Slide 4: Team helios summary (Health: Good)
- Slide 5: Team solaris summary (Health: Fair)

**Each team slide has**:
- Title showing team, project, and health
- 4 text boxes in 2x2 layout:
  - Top Left: Sprint Health Summary
  - Top Right: Key Accomplishments
  - Bottom Left: Blockers & Risks
  - Bottom Right: Recommendations

## Alternative: Use JSON/Markdown

The JSON and Markdown exports contain the same information and work perfectly:

- `output/sprint-summary-combined.json` - All teams in JSON format
- `output/sprint-summary-combined.md` - All teams in Markdown format
- `output/sprint-summary-MOLO-*.json` - Individual team JSON
- `output/sprint-summary-MOLO-*.md` - Individual team Markdown

These can be:
- Imported into other tools
- Converted to other formats
- Displayed in dashboards
- Used for reports

## Debug Commands

To help diagnose the issue, please run:

```bash
# Check file details
file output/sprint-summary-presentation.pptx

# Validate ZIP structure
unzip -t output/sprint-summary-presentation.pptx

# Check file size
ls -lh output/sprint-summary-presentation.pptx

# Try to extract and view XML
unzip -p output/sprint-summary-presentation.pptx ppt/presentation.xml | head -20
```

Please share:
1. The exact error message when you try to open the file
2. Which PowerPoint application/version you're using
3. Whether you can open the test file: `output/test-simple.pptx`
4. Results of the debug commands above
