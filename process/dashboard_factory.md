# Dashboard Factory — E2E Process for User Story to Dashboard

## Overview

This document defines a repeatable, agent-driven process that takes a user story as input and produces a validated, insight-driven dashboard prototype. It codifies the lessons learned from US1, US2, and US3 across 5+ iterations.

---

## Process Flow

```
USER STORY INPUT
      |
      v
[PHASE 0] Story Intake & Validation
      |
      v
[PHASE 1] Data Feasibility Audit
      |
      v
[PHASE 2] Insight-Action Mapping
      |  
      v
[PHASE 3] Dashboard Blueprint
      |
      v
[PHASE 4] Prototype Build
      |
      v
[PHASE 5] Review & Iterate
      |
      v
VALIDATED DASHBOARD + DOCUMENTATION
```

---

## Agent Roles

### Agent 1: Story Analyst
**Trigger**: New user story submitted  
**Inputs**: User story text, acceptance criteria, wireframes (if any)  
**Outputs**: Structured requirements document

**Responsibilities:**
- Parse the user story into: persona, goal, key decisions, acceptance criteria
- Identify ambiguities and generate clarifying questions (BEFORE any design work)
- Define what "done" looks like in measurable terms
- Flag requirements that sound like features but lack a decision to support

**Lesson from US1-3**: We built dashboards before defining KPIs properly. "Total Proposed Changes" went through 3 renames because the definition wasn't agreed upfront. This agent forces that conversation first.

### Agent 2: Data Auditor
**Trigger**: Story Analyst output is approved  
**Inputs**: Structured requirements, data model (03_VMO2_data_model.png), sample data (Dynamo), reference CSVs (07_data/)  
**Outputs**: Data feasibility report

**Responsibilities:**
- For each required metric, map to specific table.field in the data model
- Classify each metric as: FULLY SUPPORTED / PARTIALLY SUPPORTED / NOT AVAILABLE
- For NOT AVAILABLE: identify what data source is needed and flag as a dependency
- For PARTIALLY SUPPORTED: explain what's missing and propose proxy metrics
- Check sample data coverage (regions, site types, suppliers, date range)
- Flag if the dashboard would be entirely mock data (as happened with US3)

**Lesson from US3**: MSV failure rate had "no underlying data" — we built an entire dashboard on mock data before discovering this. This agent catches that at Phase 1, not Phase 4.

### Agent 3: Insight Architect
**Trigger**: Data Auditor report approved  
**Inputs**: Requirements + data feasibility report  
**Outputs**: Visual specification with insight-action chains

**Responsibilities:**
- For each proposed visual, define the complete chain:
  ```
  VISUAL → shows WHAT → reveals INSIGHT → drives ACTION → supports DECISION
  ```
- Reject any visual that cannot complete this chain
- Apply the "removal test": if this visual is removed, what decision can no longer be made? If the answer is "none" — cut it
- Define KPI calculations with exact formulas and field references
- Propose appropriate chart types (no pie charts, no decorative visuals)
- Define filter interactions and drill-down paths
- Write the info panel text for each visual (what it shows, why it matters, what action it drives)

**Lesson from iterations 1-4**: We repeatedly added then removed visuals (pie charts, Pareto cumulative lines, supplier rate KPIs, case drill-down tabs) because they didn't drive decisions. This agent prevents that churn.

### Agent 4: Dashboard Builder
**Trigger**: Insight Architect spec approved  
**Inputs**: Visual specification, data, design system CSS  
**Outputs**: Single self-contained HTML prototype

**Responsibilities:**
- Build the dashboard as a single HTML file (Chart.js + Tailwind/custom CSS)
- Use ONLY real data where available; clearly label mock/illustrative data
- Include info icons on every visual with the Insight Architect's text
- Apply the established design system (navy/red/amber/green, card layout)
- Implement interactivity: filters, toggles (W/M/Q), expandable rows, drill-downs
- Add data source annotations where data is pending integration

### Agent 5: QA Reviewer
**Trigger**: Dashboard prototype built  
**Inputs**: Prototype HTML, original requirements, insight-action spec  
**Outputs**: QA report + approved dashboard or change requests

**Responsibilities:**
- Verify every acceptance criterion from the user story is met
- Check every visual has an info icon with correct text
- Verify data is real where claimed, mock where labelled
- Check for orphaned JS references, broken charts, missing interactivity
- Run the "stakeholder 10-second test": can a busy manager extract the key insight within 10 seconds of looking at each section?
- Validate the insight-action chain for each visual against the spec
- Produce a change list if issues are found (loop back to Agent 4)

---

## Input Template

User stories are submitted as structured records with the following fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Role** | Who uses this dashboard | Design Build Analyst |
| **User Story** | As a [role], I want [goal] so that [reason] | As a DBA, I want to see component change impacts so that I can assess design risk |
| **Decision Supported** | The specific business decision this enables | Whether to approve, reject, or escalate a design submission |
| **Key Metrics/KPIs** | The measurable values to display | Retention rate, avg changes per site, weighted complexity score |
| **Visualisation Type** | Preferred chart types (guidance, not binding) | Bar chart, heatmap, trend line, KPI cards |
| **Data Sources** | Where the data comes from | dwh_equipment, dwh_site_summary, Dynamo, SiteFlo |
| **Filters/Dimensions** | How users slice the data | Region, supplier, site type, date range, config code |
| **Refresh Frequency** | How often data updates | Daily / Weekly / Monthly |
| **Acceptance Criteria** | What "done" looks like | Must show cost impact per site, must filter by region |
| **Priority** | Relative priority | High / Medium / Low |
| **Business Benefit** | Why this matters to the business | Reduces design review time by 40% |
| **ROI / Impact** | Quantified value or impact statement | Saves 2 FTE hours per day on manual review |

### How to submit

Paste the user story as a row or structured block:

```
Role: [role]
User Story: [story text]
Decision Supported: [decision]
Key Metrics/KPIs: [list]
Visualisation Type: [preferences]
Data Sources: [list]
Filters/Dimensions: [list]
Refresh Frequency: [frequency]
Acceptance Criteria: [list]
Priority: [H/M/L]
Business Benefit: [benefit]
ROI / Impact: [impact]
```

Or as a row in an Excel/CSV file matching the column headers above.

---

## Output Artefacts (per User Story)

| Artefact | Location | Purpose |
|----------|----------|---------|
| Requirements doc | `outputs/USX_requirements.md` | Agreed scope with stakeholder |
| Data feasibility report | `outputs/USX_data_audit.md` | What data exists vs what's needed |
| Visual specification | `outputs/USX_visual_spec.md` | Every visual with insight-action chain |
| Dashboard prototype | `outputs/prototype/USX_[name].html` | Interactive HTML prototype |
| Visual insight inventory | `outputs/visual_insight_inventory.md` | Updated with new dashboard visuals |
| QA report | `outputs/USX_qa_report.md` | Verification against acceptance criteria |

---

## Decision Gates

Each phase has a gate. Work does not proceed until the gate is passed.

| Gate | Question | Who Decides | Fail Action |
|------|----------|-------------|-------------|
| G0: Story Ready | Are all ambiguities resolved? | User/Stakeholder | Return clarifying questions |
| G1: Data Feasible | Is >50% of required data available? | Data Auditor + User | Descope, find proxies, or mark as future-state |
| G2: Insights Valid | Does every visual drive an action? | Insight Architect + User | Cut visuals that fail the chain |
| G3: Prototype Approved | Does it meet acceptance criteria? | QA Reviewer + User | Return change list to Builder |

---

## Lessons Codified (from US1-3)

These rules are hard-won from 5+ iterations. They MUST be followed:

### Data Rules
1. **Check data BEFORE designing** — US3 was built on zero data
2. **Use real data where it exists** — mock data misleads stakeholders
3. **Label mock data explicitly** — amber banner + per-visual notes
4. **Single cost field > hypothetical breakdown** — don't invent fields that don't exist
5. **Equipment "Type" comes from Master Component DB** — don't infer without the lookup table

### Visual Rules
6. **No pie charts** — replaced in iteration 2, never reintroduce
7. **No cumulative lines on Pareto charts** — removed in iterations 3-4
8. **Every visual needs an info icon** — added in iteration 5, now standard
9. **Every KPI needs a formula** — "Total Proposed Changes" was undefined for 3 iterations
10. **Focus on exceptions, not averages** — stakeholder said "focus on where sites move category"

### Process Rules
11. **Define KPI calculations BEFORE building** — avoids rename churn
12. **Get stakeholder sign-off on weighting/scoring** — mark proposed schemes clearly
13. **Remove > add** — a clean dashboard with 5 strong visuals beats 15 weak ones
14. **Tabs should be minimal** — US1 went from 3→2 tabs, US2 from 4→2, US3 from 4→1
15. **Drill-downs as expandable rows, not separate tabs** — lesson from US2 iteration 5

### Annotation Rules
16. **Every visual has**: what it shows, what insight it drives, what action it supports
17. **Data gaps noted inline**: "Pending Master Component DB" or "Requires SiteFlo integration"
18. **Proposed business rules flagged**: "Requires Stakeholder Sign-off"

---

## Design System (Established)

```css
/* Colours */
--navy:    #1a2d4f    /* Primary, headers, active states */
--red:     #C8102E    /* Risk, critical, alerts */
--amber:   #d97706    /* Warning, at-risk, caution */
--green:   #166534    /* Safe, compliant, positive */
--bg:      #f8f9fa    /* Card backgrounds */
--border:  #e0e0e0    /* Card borders */

/* Component patterns */
KPI card:     .kpi with .red/.amb/.grn for RAG
Chart card:   .cc with position:relative for info icons
Info icon:    .info-btn (18x18 circle, top-right)
Info panel:   .info-panel with fade-in animation
Toggle group: .toggle-group with active state
Table:        sortable, filterable, expandable rows
```

**Technology**: Single self-contained HTML file, Chart.js 4.4.1 from CDN, no backend.

---

## Reference Data Assets

| File | Purpose | Used By |
|------|---------|---------|
| `context/03_VMO2_data_model.png` | Entity relationship diagram | Data Auditor |
| `context/05_user_stories.xlsx` | Original user story definitions | Story Analyst |
| `context/Dynamo Data Sample.xlsx` | Real sample data (10 sites, 50 equipment rows) | Dashboard Builder |
| `context/07_data/config-codes.csv` | RF config code → vendor mapping | Builder |
| `context/07_data/rental-categories.csv` | Rental costs by SiteType × Area × BSFConfig | Builder |
| `context/07_data/site-info.csv` | Site master data (CSR, region, type, supplier) | Builder |
| `context/07_data/supplier.csv` | Supplier reference list | Builder |
| `context/07_data/equipment-location.csv` | Equipment location reference | Builder |

---

## How to Run This Process

### For a new user story:

```
1. User fills in the Input Template (above)
2. Paste into Claude Code with this prompt:

   "Process this user story through the Dashboard Factory pipeline.
    Follow the process in process/dashboard_factory.md.
    Run Phase 0 (Story Analyst) first and present clarifying questions.
    Do NOT proceed to Phase 1 until I approve."

3. Answer clarifying questions
4. Each phase produces an artefact and waits for approval
5. Final output: validated HTML prototype + documentation
```

### For updating an existing dashboard:

```
1. Describe the change needed
2. Paste with this prompt:

   "Apply this change to [US1/US2/US3].
    Follow the Lessons Codified in process/dashboard_factory.md.
    Update the info icon text for any affected visuals.
    Update visual_insight_inventory.md."
```
