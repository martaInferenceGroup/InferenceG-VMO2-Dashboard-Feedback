# VMO2 Phase 2 Dashboards — Claude Code Context

## Project
Telecom operations dashboards for VMO2. Three user stories (US1-3) have been built as HTML prototypes through 5+ iterations.

## Dashboard Factory Process
When creating or updating dashboards, follow `process/dashboard_factory.md`. This defines:
- 5-phase pipeline: Story Analyst → Data Auditor → Insight Architect → Builder → QA
- Agent prompts in `process/agent_prompts.md`
- Decision gates between each phase
- Lessons codified from US1-3 iterations

## Hard Rules (from iteration history)
- No pie charts — always use bar/stacked bar
- No cumulative lines on Pareto charts
- Every visual MUST have an info icon explaining what it drives
- Every KPI MUST have a defined formula before building
- Check data availability BEFORE designing (US3 lesson)
- Use real data where available; label mock data with amber banners
- Prefer expandable rows over drill-down tabs
- Mark proposed business rules as "Requires Stakeholder Sign-off"
- Equipment "Type" field comes from Master Component DB (in development)
- Map tiles: use CartoCDN, NOT OpenStreetMap directly (causes 403)
- Single self-contained HTML files with Chart.js 4.4.1 from CDN

## Key Files
- `process/dashboard_factory.md` — Full process definition
- `process/agent_prompts.md` — Agent prompt templates
- `outputs/prototype/US1_component_change_impact.html` — US1 dashboard
- `outputs/prototype/US2_nonstandard_design_detection.html` — US2 dashboard  
- `outputs/prototype/US3_design_trend_analysis.html` — US3 dashboard
- `outputs/visual_insight_inventory.md` — All visuals documented
- `outputs/iteration5_change_plan.md` — Latest change plan
- `context/03_VMO2_data_model.png` — Data model
- `context/Dynamo Data Sample.xlsx` — Real sample data
- `context/07_data/` — Reference CSVs

## Design System
- Colours: navy (#1a2d4f), red (#C8102E), amber (#d97706), green (#166534)
- CSS classes: .kpi, .cc, .fb, .tabs, .info-btn, .info-panel, .toggle-group
- Technology: HTML + Chart.js + Leaflet (CartoCDN tiles), no backend
