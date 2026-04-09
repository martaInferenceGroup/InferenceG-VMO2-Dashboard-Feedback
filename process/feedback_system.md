# Dashboard Feedback & Versioning System

## Problem This Solves

In iterations 1-5 of US1/US2/US3, feedback came through:
- Separate markdown files (dashboard_updates.md, iteration3, iteration4)
- Verbal/chat descriptions ("remove the Pareto line", "rename this KPI")
- Annotated screenshots (post-it notes on images)

This caused:
- Ambiguity about WHICH visual a comment referred to
- Lost context between feedback and implementation
- No version history — changes overwrite previous state
- No way to track whether feedback was addressed

## Solution: In-Dashboard Feedback Mode

Each dashboard has a built-in feedback panel that:
1. Lets reviewers leave comments on **specific visuals** or **overall dashboard**
2. Stores comments as structured JSON inside the HTML file
3. Can be exported for Claude to process
4. Tracks version history and what changed

## How It Works

### For the Reviewer:
1. Open the dashboard in a browser
2. Click the "Feedback Mode" toggle (top-right corner)
3. Every visual gets a speech bubble icon
4. Click the bubble → type your comment
5. Add overall dashboard comments in the top panel
6. Click "Export Feedback" → copies JSON to clipboard
7. Paste into Claude Code → dashboard gets updated

### For Claude:
1. Receives the exported feedback JSON
2. Reads each comment with its visual ID and context
3. Applies changes following the Dashboard Factory rules
4. Increments the version number
5. Marks each comment as "addressed" in the new version
6. Preserves all info icons and annotations

### Version Tracking:
- Each dashboard has a version number in the header (e.g., "v5.1")
- Major version = new user story or major restructure
- Minor version = feedback-driven iteration
- Version history is stored in the HTML as a hidden JSON block

## Feedback JSON Schema

```json
{
  "dashboard": "US1",
  "version": "5.0",
  "reviewer": "Marta",
  "date": "2026-04-08",
  "overall": [
    {
      "comment": "Dashboard feels cluttered — can we reduce to 4 KPIs?",
      "priority": "high"
    }
  ],
  "visuals": [
    {
      "id": "kpi-retention-rate",
      "name": "Retention Rate",
      "tab": "Portfolio Overview",
      "type": "change",
      "comment": "Rename to 'Equipment Retention' — clearer for procurement team",
      "priority": "medium"
    },
    {
      "id": "chart-submissions",
      "name": "Submissions per week",
      "tab": "Portfolio Overview",
      "type": "remove",
      "comment": "Not useful for our decision-making — remove entirely",
      "priority": "high"
    },
    {
      "id": "table-all-submissions",
      "name": "All Submissions Table",
      "tab": "Portfolio Overview",
      "type": "change",
      "comment": "Add a 'Days Since Submission' column",
      "priority": "low"
    }
  ]
}
```

### Comment Types:
- `change` — modify this visual (rename, reformat, add data, etc.)
- `remove` — delete this visual entirely
- `add` — add a new visual (describe what's needed)
- `question` — question for the team (doesn't trigger a change)
- `approve` — explicitly mark this visual as good (no changes needed)

### Priority Levels:
- `high` — must be addressed in next iteration
- `medium` — should be addressed
- `low` — nice to have

## Integration with Dashboard Factory Process

The feedback system adds a loop after Phase 4 (QA):

```
Phase 4: QA → Dashboard v1.0 delivered
      ↓
Phase 5: FEEDBACK COLLECTION
  - Reviewer opens dashboard, enables Feedback Mode
  - Leaves comments per-visual and overall
  - Exports feedback JSON
      ↓
Phase 6: FEEDBACK PROCESSING  
  - Claude reads feedback JSON
  - Validates each comment against Dashboard Factory rules
  - Produces a change plan (what will change, what won't and why)
  - User approves the change plan
      ↓
Phase 7: VERSION UPDATE
  - Claude applies approved changes
  - Increments version (v1.0 → v1.1)
  - Updates info icons on affected visuals
  - Marks feedback as addressed
  - Updates visual_insight_inventory.md
      ↓
  Loop back to Phase 5 until approved
```
