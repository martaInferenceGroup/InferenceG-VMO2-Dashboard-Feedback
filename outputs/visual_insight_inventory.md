# Visual Insight Inventory — VMO2 Phase 2 Dashboards

All visuals across US1, US2, and US3 with the insight each drives.

---

## US1 — Component Change Impact Assessment

### Tab 1: Portfolio Overview

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 1 | Total proposed changes | KPI (1,847) | Count of design submissions received | Current programme scale and weekly momentum (+62) | Whether submission throughput is on track |
| 2 | Major upgrades | KPI (438) | Full equipment swap or new technology installs | 24% of portfolio requires significant investment | Budget allocation between major vs minor works |
| 3 | Minor upgrades | KPI (1,182) | Config changes, firmware, or parameter updates | Majority of work is lower-cost modifications | Resource planning — fewer specialist crews needed |
| 4 | Sites w/ flagged components | KPI (214) | Sites with components requiring review before approval | 11.6% of portfolio has risk items needing attention | Where to focus quality review effort |
| 5 | Component substitution rate | KPI (16%) | Proportion replaced with non-identical component | Rising from 12% — supply chain pressure increasing | Whether to engage alternative vendors or escalate procurement |
| 6 | Avg design version age | KPI (5.8 mo) | Time since last design revision across portfolio | Some designs are 16 months old — may be outdated | Which sites need design refresh before build |
| 7 | Site locations — lifecycle status | Leaflet map | Geographic spread of sites colour-coded by lifecycle (Active/At Risk/EOL) | Regional clustering of at-risk or EOL sites | Where to deploy field teams; regional risk concentration |
| 8 | Site status by region | Grouped bar chart | Breakdown of Pre-access / Active / On hold / Complete by region | London has highest volume; North has most on-hold sites | Regional resource allocation and bottleneck identification |
| 9 | Config codes — treemap | Treemap | Relative volume of each config code, coloured by vendor (Nokia/Ericsson) | Which config codes dominate the portfolio | Standardisation opportunities; vendor dependency risk |
| 10 | Avg cost by site type — baseline vs proposed | Grouped bar chart | Baseline vs proposed cost per site type | Street Furniture has highest cost variance (+£2.7k avg) | Where cost control measures are most needed |
| 11 | Rental category by BSFConfig | Grouped bar chart | Rental costs by Min- / Min / Loading across site types | Rooftop sites have significantly higher rental costs | Lease negotiation priorities; site type cost modelling |
| 12 | Submissions per week | Bar chart | Weekly submission volume over 8 weeks | Throughput is increasing (148 → 232 per week) | Whether pipeline is accelerating or plateauing |
| 13 | All submissions table | Data table (25 rows) | Full list of all submissions with status, lifecycle, cost, non-std flag | Filterable view of every site with flagged row highlighting | Drill-down into individual sites; identify flagged cases |

### Tab 2: Site Detail — Equipment List

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 14 | Site summary panel | Key-value panel | CSR, region, site type, supplier, config code, status, costs | Complete site context at a glance | Whether this site needs intervention |
| 15 | Component Status Summary | RAG dot list | Each component's lifecycle status with notes | Which specific components are at risk or EOL | Targeted component replacement decisions |
| 16 | Scope summary | Key-value panel | Total line items, flagged items, EOL count, complexity score | Site complexity ranking (out of 10) | Prioritise complex sites for additional resource |
| 17 | Equipment list | Data table | Baseline vs Proposed cost per component with overspend, lifecycle, RAG | Exactly which components are driving cost and risk | Approve/reject individual component changes |
| 18 | Cost overspend waterfall | Waterfall chart | Component-level cost breakdown showing each overspend contribution | Which equipment items cause the most overspend at this site | Challenge or approve specific line items |

### Tab 3: Cost & Lifecycle Analysis

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 19 | Total baseline cost | KPI (£48.2M) | Original portfolio cost before changes | Baseline reference for overspend calculation | Budget variance tracking |
| 20 | Total proposed cost | KPI (£50.6M) | New portfolio cost after all proposed changes | Total investment required | Budget approval / re-forecast |
| 21 | Net cost overspend | KPI (+£2.4M) | Difference between proposed and baseline | 5.0% increase — is this within tolerance? | Escalate to finance if above threshold |
| 22 | EOL replacement cost | KPI (£1.1M) | Cost of replacing end-of-life components (53 items) | Nearly half of overspend is mandatory EOL replacement | Ring-fence EOL budget separately |
| 23 | Cost overspend waterfall — portfolio | Waterfall chart | Breakdown: Baseline → Major → Minor → EOL → Substitutions → Proposed | Major upgrades (+£1.8M) are the primary cost driver | Where to challenge costs for savings |
| 24 | Lifecycle status distribution | Horizontal stacked bar | Active 78% / At Risk 15% / EOL 7% | 22% of portfolio has lifecycle concerns | Scale of upcoming replacement programme |
| 25 | Cost overspend by region | Heatmap | Overspend (£k) by region × site type | London Rooftop (+£124k) is highest overspend cell | Target cost reviews to London rooftop sites |
| 26 | Design version age distribution | Histogram | Sites grouped by design age (0–3 mo to 12+ mo) | 227 sites (12%) have designs older than 12 months | Trigger design refresh for stale sites |
| 27 | EOL component register | Data table (15 rows) | Each EOL component with current model, replacement, cost, priority | Actionable replacement list with priority ranking | Plan procurement and schedule replacements |

---

## US2 — Non-Standard Design Detection

### Tab 1: Overview & Pareto

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 1 | Total non-standard flags | KPI (156) | Total non-conformances across 142 sites | Scale of non-standard design problem | Whether the non-std rate is acceptable |
| 2 | Critical severity | KPI (23) | Non-conformances requiring immediate action | 15% of flags are critical — need urgent response | Prioritise critical cases for same-day review |
| 3 | Design guide adherence | KPI (88%) | Proportion of designs conforming to design guide | 7% gap to 95% target — significant improvement needed | Whether to enforce stricter design gate checks |
| 4 | Pending review | KPI (41) | Cases awaiting DBA decision | Backlog size — is the review team keeping up? | Staff the review queue or redistribute workload |
| 5 | Under escalation | KPI (12) | Cases escalated to vendor | Vendor-driven issues requiring external resolution | Chase vendor responses; escalation SLA monitoring |
| 6 | Total non-standard | KPI (156) | All non-standard flags across all categories | Headline count for executive reporting | Portfolio-level risk assessment |
| 7 | Avg approval time | KPI (4.2 days) | Mean time from submission to decision | Within <5 day target — process is functioning | Whether to tighten or relax the SLA |
| 8 | Non-standard flags — Pareto | Bar chart | Non-std count by category (Non-std equip, Config mismatch, etc.) | Non-std equipment (38) is the dominant category | Focus improvement efforts on equipment standardisation |
| 9 | Non-standard trend — weekly | Line chart | Weekly non-std submission volume over 16 weeks | Upward trend (4 → 15 per week) — problem is growing | Investigate root cause of increasing non-conformance |
| 10 | Flags by region — stacked bar | Stacked bar chart | Non-std flags by region, broken down by category | North has highest flag count; London leads in equipment issues | Regional quality intervention targeting |
| 11 | Severity distribution | Horizontal bar chart | Count by Critical / Major / Minor | Major (67) and Minor (66) dominate; Critical (23) needs focus | Triage approach — fast-track criticals |
| 12 | All non-standard designs table | Data table (20 rows) | Every non-std case with category, severity, component, status | Full case-level detail for review and action | Click through to investigate individual cases |

### Tab 2: Supplier & RF Analysis

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 13 | Most common RF code issue | KPI (N01B-M3-2-v1) | RF config code with most non-std flags (14) | Specific config causing repeated problems | Investigate whether this RF code needs redesign |
| 14 | Suppliers above threshold | KPI (3) | Number of suppliers with non-std rate >10% | 3 of 8 suppliers have unacceptable quality | Trigger supplier quality reviews for Circet, Clarke, ICS |
| 15 | Supplier comparison — non-std rate | Horizontal bar chart | Non-std rate (%) per supplier, colour-coded by threshold | Circet (18.4%) is worst performer; WHP (3.2%) is best | Performance-based supplier management actions |
| 16 | Supplier trend — monthly | Multi-line chart | Monthly non-std rate trajectory per supplier | Circet trending upward; WHP stable and low | Whether Circet's trajectory warrants formal intervention |
| 17 | Non-std flags by RF config code | Bar chart | Flag count per RF config code, coloured by vendor | N01B-M3-2-v1 has 14 flags — 2× higher than average | Review this specific config code's design template |
| 18 | RF code family vs non-conformance heatmap | Heatmap grid | Cross-reference of RF code families × non-conformance types | E01A has highest config mismatch rate (8) | Target design template fixes for E01A family |
| 19 | Supplier performance summary table | Data table (8 rows) | Per-supplier: total designs, non-std count/rate, approval time, trend | Complete supplier quality scorecard with trend arrows | Formal supplier performance reviews |

### Tab 3: Approval Workflow

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 20 | In workflow | KPI (53) | Cases pending decision | Current queue depth | Whether review capacity is sufficient |
| 21 | Avg cycle time | KPI (4.2 days) | Average submission-to-decision time | Process speed is within SLA | Whether process improvement is needed |
| 22 | SLA compliance | KPI (82%) | Percentage of cases decided within 5-day SLA | 8% gap to 90% target — improvement needed | Add reviewers or streamline process |
| 23 | Rejection rate | KPI (14%) | Proportion of reviewed cases rejected | 1 in 7 designs rejected — is this too high or appropriate? | Whether pre-submission checks need improvement |
| 24 | Approval workflow funnel | Funnel visualisation | Drop-off at each stage: 156 → 128 → 74 → 53 → outcomes | Biggest bottleneck: 54 cases stuck at "awaiting supplier response" | Chase suppliers; set supplier response SLAs |
| 25 | Tracking status cards | 3 status cards | On Track (32) / At Risk (14) / Overdue (7) | 7 cases past SLA — need immediate escalation | Escalate overdue cases today |
| 26 | Overdue items table | Data table | Overdue cases with CSR, days pending, target date | Specific cases needing action with deadline visibility | Assign and chase each overdue case |
| 27 | Approval time distribution | Histogram | Distribution of approval times in day bands | Most approvals happen in 1–3 days; long tail exists | Investigate what causes the 7+ day outliers |
| 28 | Workflow aging | Horizontal bar chart | Open items grouped by days pending (0–1 to 14+ days) | 7 items pending 7+ days — at risk of SLA breach | Prioritise oldest items in the review queue |
| 29 | Active workflow items table | Data table (15 rows) | Each open case with severity, assignee, days pending, track status, actions | Actionable worklist with Approve/Reject/Escalate buttons | Process cases directly from the dashboard |

### Tab 4: Case Drill-Down

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 30 | Site summary panel | Key-value panel | CSR, site name, region, type, supplier, RF code, status, reviewer | Full context for the case under review | Understand the site before making a decision |
| 31 | Non-conformance details table | Data table | Each flag: category, component, description, severity, reference, recommendation | Exactly what is wrong and what standard it violates | Approve, reject, or request modification |
| 32 | Design version comparison table | Data table | Version history with dates, changes, reviewer | How the design has evolved and who reviewed it | Whether sufficient rework has been done |

---

## US3 — Design Trend & Issue Analysis

### Tab 1: MSV & Rework Overview

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 1 | MSV failure rate | KPI (49.3%) | Percentage of designs failing MSV check | 9.3% above 40% target — quality is below standard | Trigger design quality improvement programme |
| 2 | Rework rate | KPI (22.7%) | Proportion of submitted designs sent back | Nearly 1 in 4 designs requires rework | Assess cost of rework; improve first-pass quality |
| 3 | Avg design cycle time | KPI (14.2 days) | Average days from submission to approval | 4.2 days over 10-day target — pipeline is slow | Identify and remove process bottlenecks |
| 4 | Total designs submitted | KPI (1,847) | Volume of designs in the period | Scale reference for rate calculations | Contextualise percentages with actual volumes |
| 5 | Designs requiring rework | KPI (419) | Absolute count of rework cases | 419 wasted design cycles this period | Quantify cost of poor quality |
| 6 | Avg delay days | KPI (6.4) | Mean delay per rework cycle | Each rework adds ~6 days to the programme | Calculate programme delay impact |
| 7 | Repeat offender sites | KPI (47) | Sites with 3+ rework cycles | 47 chronic problem sites consuming disproportionate resource | Assign dedicated support to worst sites |
| 8 | First-pass approval rate | KPI (50.7%) | Designs approved on first submission | Only half of designs pass first time — target is 60% | Measure effectiveness of pre-submission checks |
| 9 | MSV failure rate — 12-week trend | Line chart with target | Weekly MSV failure rate vs 40% target | Rate oscillates 47–52%, consistently above target | Whether the trend is improving or static |
| 10 | Rework rate trend | Line chart with confidence band | Weekly rework rate with upper/lower bounds | Rework rate stable at 21–25% — not improving | Current interventions are not reducing rework |
| 11 | Design cycle time distribution | Histogram | Sites grouped by cycle time bands | Most designs take 10–15 days; significant tail at 20+ | Target the 20+ day cohort for process improvement |
| 12 | Submissions vs reworks per week | Combo bar + line chart | Weekly submissions (bars) vs rework count (line) | Rework count rising proportionally with submissions | Rework rate is a structural problem, not volume-driven |
| 13 | Delay days by issue category — Pareto | Pareto chart (full-width) | Total delay days per issue category with cumulative % | Missing docs (486 days) and antenna config (378 days) cause 48% of all delay | Fix documentation and antenna processes first |

### Tab 2: Issue Category Analysis

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 14 | Top issue category | KPI (Missing docs) | Most frequent issue type (28%, 112 cases) | Documentation is the single biggest quality gap | Implement documentation checklist or automation |
| 15 | Standardised label rate | KPI (96.8%) | Proportion of issues with standardised category labels | Categorisation quality is high — data is reliable | Trust the category-level analysis for decisions |
| 16 | Avg delay per issue | KPI (3.2 days) | Mean delay caused per individual issue | Each issue adds ~3 days — multiply by issues per site for total impact | Prioritise by delay impact, not just count |
| 17 | Issue categories — Pareto | Pareto chart | Issue count by category with cumulative % | Top 3 categories (Missing docs, Antenna config, Power spec) account for 64% of all issues | Focus improvement on these 3 categories first |
| 18 | Issue category trend — monthly | Stacked area chart | Monthly volume by issue category over 6 months | Missing docs growing fastest (15 → 26/month) | Documentation problem is worsening — act now |
| 19 | Region vs issue category — heatmap | Heatmap grid | Issue count by region × category | UK-North has 42 missing doc issues — highest cell | Regional documentation training needed in North |
| 20 | Avg delay days by issue category | Horizontal bar chart | Mean delay per issue type | RF coverage issues cause longest delay (5.0 days) despite being less frequent | RF issues have outsized programme impact |
| 21 | Issue category summary table | Data table (8 rows) | Category, count, %, avg delay, top region, top supplier, trend | Complete category-level view with trend arrows | Identify worsening categories for intervention |

### Tab 3: Supplier & Region Deep-Dive

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 22 | Worst region failure rate | KPI (UK-North 56%) | Region with highest MSV failure rate | North fails MSV on more than half of submissions | Deploy additional design support to North region |
| 23 | Worst supplier rework rate | KPI (Circet 31%) | Supplier with highest rework rate | Circet sends back nearly 1 in 3 designs | Formal performance improvement plan for Circet |
| 24 | Supplier MSV failure rate | Horizontal bar chart | MSV failure rate per supplier, RAG-coloured | Circet (58%), Clarke (52%), ICS (51%) all above 50% | 3 suppliers need quality improvement programmes |
| 25 | Supplier avg cycle time | Horizontal bar chart with target line | Average design cycle time per supplier vs 10-day target | All suppliers exceed 10-day target; Circet at 18.4 days | Set supplier-specific cycle time improvement targets |
| 26 | Region rework rate | Bar chart | Rework rate per region | North (28%) is worst; London (18%) is best | Allocate QA resource proportionally to regional risk |
| 27 | Delay days by region — monthly trend | Multi-line chart | Monthly delay trend per region | North consistently highest (7.2–8.1 days); gap is widening | North region needs dedicated programme manager |
| 28 | Supplier × Region heatmap | Full-width heatmap | Failure rate by supplier × region | Circet in North (64%) is the worst combination | Assign Circet's North work to another supplier or add oversight |
| 29 | Supplier scorecard table | Data table (8 rows) | Full supplier metrics: submissions, MSV pass, rework, cycle time, delay, RAG | Complete supplier performance comparison with RAG status | Contractual performance reviews; supplier ranking |

### Tab 4: Case Drill-Down

| # | Visual | Type | What It Shows | Key Insight | Decision Supported |
|---|--------|------|---------------|-------------|-------------------|
| 30 | Site summary panel | Key-value panel | CSR, site, region, type, supplier, submission date, status | Full case context for investigation | Understand the site before reviewing issues |
| 31 | Issue timeline | Timeline visualisation | Chronological sequence of events (submission, MSV check, rework, etc.) | Where in the process delays occurred | Identify process stage causing the hold-up |
| 32 | Issue details table | Data table | Each issue: category, description, delay days, resolution, status | Specific problems and their current resolution status | Decide whether resolved issues are acceptable |
| 33 | Rework history table | Data table | Each design version: submission date, result, issues found, cycle time | How many rework cycles and whether quality is improving | Whether to approve or request further rework |

---

## Summary

| Dashboard | KPIs | Charts | Tables | Maps | Other | Total |
|-----------|------|--------|--------|------|-------|-------|
| US1 — Component Change Impact | 10 | 8 | 3 | 1 | 3 (treemap, heatmap, stacked bar) | 25 |
| US2 — Non-Standard Design Detection | 11 | 6 | 5 | 0 | 4 (funnel, heatmap, tracking cards) | 26 |
| US3 — Design Trend Analysis | 10 | 10 | 3 | 0 | 2 (heatmaps) | 25 |
| **Total** | **31** | **24** | **11** | **1** | **9** | **76** |
