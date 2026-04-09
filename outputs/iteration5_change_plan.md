# Iteration 5 — Dashboard Change Plan

## Decisions Made

| # | Decision | Direction |
|---|----------|-----------|
| 1 | US3 | Keep as labelled future-state prototype — mark "No Live Data" |
| 2 | Major/Minor weighting | Create proposed scheme, clearly flagged as needing stakeholder-defined rules |
| 3 | Equipment Type column | Sourced from Master Component DB (being built) — placeholder until available |
| 4 | Cost columns | Use existing `calculated_cost_usd` only — no hypothetical breakdowns |
| 5 | US2 | Apply UI-only changes now, label all data as mock |
| 6 | Data scope | Real data only (~12 CSRs from Dynamo sample, all South/Greenfield) |

---

## US1 — Component Change Impact Assessment

### Tab 1: Portfolio Overview

#### SNAPSHOT 1 — KPI Row 1 (4 cards)

```
BEFORE:
[Total Proposed Changes: 1,847] [Major Upgrades: 438] [Minor Upgrades: 1,182] [Sites w/ Flagged Components: 214]

AFTER:
[Avg Changes per Site: 4.7]    [Major Score: 312]             [Minor Score: 1,108]            [Sites w/ Flagged Components: 214]
 "equipment removed +            "Weighted score > threshold"    "Weighted score ≤ threshold"     "Require review"
  proposed per site"
```

**Changes & Why:**

1. **"Total Proposed Changes" → "Avg Changes per Site"**
   - WHY: Stakeholder said raw count is misleading — a portfolio of 2,000 sites with 2,000 changes is very different from 200 sites with 2,000 changes. Average normalises for portfolio size.
   - CALCULATION: (count equipment with status=NEW/PROPOSED + count equipment with status removed) / distinct CSR count
   - DATA: `dwh_equipment.status`, grouped by `csr_id` — **fully supported**

2. **"Major Upgrades" → "Major Score"**
   - WHY: Stakeholder wants an objective, weighted classification — not a subjective label.
   - PROPOSED WEIGHTING SCHEME (example, pending stakeholder approval):

   ```
   ⚠️ PROPOSED WEIGHTING — REQUIRES STAKEHOLDER SIGN-OFF

   Component weights (by type):
     Antenna/Radio unit  = 3 points
     Power system (PSU)  = 2 points
     Passive (cabinet, cable, bracket) = 1 point

   Per-site score = Σ (component_weight × quantity × upgrade_multiplier)
     where upgrade_multiplier = 2 if upgrade_required_y_n = 'Y', else 1

   Major threshold: score ≥ 15
   Minor threshold: score < 15

   Example: Site with 3 new antennas (3×3×1=9) + 1 PSU upgrade (2×1×2=4) = 13 → Minor
   Example: Site with 3 new antennas (9) + 2 PSU upgrades (8) = 17 → Major
   ```

   - DATA: `dwh_equipment.manufacturer`, `dwh_equipment.model`, `dwh_equipment.quantity`, `dwh_equipment.upgrade_required_y_n`
   - NOTE: Equipment "type" (antenna/radio/power/passive) will come from Master Component DB being built. Until then, type is inferred from manufacturer/model strings.

3. **"Minor Upgrades" → "Minor Score"** — same scheme, below threshold.

#### SNAPSHOT 2 — KPI Row 2 (2 cards)

```
BEFORE:
[Component Substitution Rate: 16%] [Avg Design Version Age: 5.8 mo]

AFTER:
[Retention Rate: 68%]              [Avg Design Version Age: 5.8 mo]
 "% of existing equipment            "Sites >12mo flagged red,
  retained (status=REMAIN)"           >6mo flagged amber"
```

**Changes & Why:**

4. **"Component Substitution Rate" → "Retention Rate"**
   - WHY: Stakeholder said "remove vs proposed is not always like-for-like." Retention rate measures what's kept, not what's swapped — simpler and more accurate.
   - CALCULATION: count(status=REMAIN) / count(existing_proposed=EXISTING)
   - DATA: `dwh_equipment.status`, `dwh_equipment.existing_proposed` — **fully supported**

5. **"Avg Design Version Age" — add RAG thresholds**
   - WHY: Stakeholder said sites past a certain age need realignment to design guidance. RAG makes this actionable at a glance.
   - DATA: Derived from document timestamps (`dwh_design_info.created_at`) — **partially supported** (age must be calculated)

#### SNAPSHOT 3 — Charts Row (Map + Site Status)

```
BEFORE:
[SVG Map with all regions]  [Site Status by Region — stacked bar]

AFTER:
[SVG Map — South region only, real NGR coords]  [Site Status by Region — South only]
 "8 real sites plotted from Dynamo data"           "Performance by region to identify
  Only South region has data points"                training needs"
```

**Changes & Why:**

6. **Map — real coordinates only**
   - WHY: Decision to use real data only. Dynamo sample has ~12 CSRs all in South region with real NGR easting/northing coordinates.
   - DATA: `dwh_cell_site.ngr_east`, `dwh_cell_site.ngr_north` — **fully supported for South**
   - NOTE: Other regions will show as empty until more data is ingested.

7. **Site Status by Region — scope to available data**
   - WHY: Stakeholder purpose is "understand regional performance to determine training needs." With only South data, the chart shows South performance only. Honest representation.

#### SNAPSHOT 4 — Cost & Rental Charts

```
BEFORE:
[Avg Cost by Site Type — grouped bar]     [Rental Category by BSFConfig — 3 categories]

AFTER:
[Rental Category Movers — exception list]  [Loading Category Investigation — filtered view]
 "Sites moving to higher rental category"    "Only 'Loading' configs shown — verify
  Focus on exceptions only"                   config correctness"
```

**Changes & Why:**

8. **"Avg Cost by Site Type" → "Rental Category Movers"**
   - WHY: Stakeholder said "just need to understand where a site is moving from one category to a higher one — focus on exceptions." A full average chart hides the outliers that matter.
   - DATA: Rental category derived from `dwh_equipment` weight/dimensions + external business rules — **partially supported**
   - NOTE: With only real data (all Greenfield), this view may show few or no movers initially.

9. **"Rental Category by BSFConfig" → "Loading Category Investigation"**
   - WHY: Stakeholder said "anything in Loading would be investigated to ensure config is correct. Focus purely on Loading."
   - DATA: `dwh_design_info.icnirp_config_capacity` — **supported**. Real values include: SMALL, HIGH, V4.8, and full config strings like "09 - VM - V4.8 - GR - B - F - 0"

#### SNAPSHOT 5 — Submissions Chart

```
BEFORE:
[Submissions per week — single bar, W/M/Q toggle]

AFTER:
[Submissions per week — stacked bar: GA | DD, W/M/Q toggle]
 "Split by General Arrangement vs Detailed Design"
 "Filter by region/supplier available"
```

**Changes & Why:**

10. **Split into GA and DD**
    - WHY: Stakeholder said "maybe split into GA and DD" — different submission types have different review complexity.
    - DATA: Can be inferred from `dwh_design_info.doc_ref` (e.g., "SDN0006" vs "UKDBS_BAU_705") or `dwh_design_info.standard_type` — **partially supported**
    - NOTE: Only ~10 submissions in real data, all from Dec 2025 – Jan 2026.

#### SNAPSHOT 6 — All Submissions Table

```
BEFORE:
CSR | Site Name | Region | Supplier | Site Type | Upgrade | Status | Lifecycle | Design Ver. | Non-Std | Est. Cost

AFTER:
CSR | Site Name | Region | Supplier | Site Type | Components Removed | Components Added | Est. Cost (USD) | Design Ver. | Config
 "Sorted newest first"
 "Removed columns: Upgrade, Status, Lifecycle, Non-Std (not in real data)"
 "Added columns: Components Removed, Components Added (from dwh_equipment)"
 "Est. Cost uses calculated_cost_usd — single value, not split into base/passive/active"
```

**Changes & Why:**

11. **Sort newest first** — stakeholder explicitly requested reverse chronological order.

12. **Add Components Removed / Components Added counts**
    - CALCULATION: Per CSR, count equipment rows where status in (REMOVE, removed indicators) vs status in (NEW, PROPOSED)
    - DATA: `dwh_equipment.status` — **fully supported**

13. **Use `calculated_cost_usd` as-is**
    - WHY: Stakeholder ideally wants base service fee / passive cost / active cost split, but this decomposition does not exist in the data model. Using the single cost field that exists is honest.
    - NOTE ON DASHBOARD: "Cost shown is calculated_cost_usd from site summary. Breakdown into base/passive/active costs requires additional data fields not yet available in the data warehouse."

14. **Remove columns not backed by real data**: Upgrade, Status, Lifecycle, Non-Std flags — these are mock values with no real data source.

#### SNAPSHOT 7 — Real Data: Sites in Table

```
Real CSRs from Dynamo sample (newest first):

CSR    | Site Name              | Region | Supplier        | Site Type  | Removed | Added | Est. Cost
75349  | HALSALL FIELD          | South  | Circet UK       | Greenfield | 5       | 9     | £1.08
71252  | NORWICH UNITED FC      | South  | —               | Greenfield | —       | —     | —
71258  | AQUAFIBRE LTD          | South  | —               | Greenfield | —       | —     | —
31645  | BRANTHAM GLEBE WOODS   | South  | —               | Greenfield | —       | —     | —
11601  | BEACON 4               | South  | —               | Greenfield | —       | —     | —
350    | TEMPLE WOOD            | South  | —               | Greenfield | —       | —     | —
9544   | PARKLANDS FARM         | South  | —               | Greenfield | —       | —     | —
69037  | STOWS FARM             | South  | —               | Greenfield | —       | —     | —
67498  | PAINES WOOD SITE       | South  | —               | Greenfield | —       | —     | —
3033   | LANGNEY NEW            | South  | —               | Greenfield | —       | —     | —
...

NOTE: Equipment data (Query 4) only covers CSRs 75349, 11604, 43828, 47771, 2124.
      Cost data (Query 3) covers ~7 CSRs but values are very low (0–1.08).
      Supplier data only available for CSRs linked in Query 3.
```

### Tab 2: Site Detail — Equipment List

#### SNAPSHOT 8 — Equipment Table Restructure

```
BEFORE:
Item/Component | Location | Baseline £ | Proposed £ | Overspend | Lifecycle | RAG | Note

AFTER:
Existing/Proposed | Component Name (bold) | Type | Manufacturer | Model | Location | Qty | Dimensions | Weight | Status | Flag
 "Type column sourced from Master Component DB (being built)"
 "Baseline cost removed — stakeholder said it's a site metric, not component-level"
 "Flag status column added"
```

**Changes & Why:**

15. **Add Existing/Proposed column** — stakeholder explicitly requested. DATA: `dwh_equipment.existing_proposed` — **fully supported** (values: EXISTING, PROPOSED, or None)

16. **Add Type column** — stakeholder wants (antenna, radio, power, etc.). DATA: Will come from Master Component DB being built. Until then, show "Pending" or inferred from manufacturer/model.
    - NOTE ON DASHBOARD: "Component Type will be populated from the Master Component Database currently under development."

17. **Remove Baseline/Proposed cost columns** — stakeholder said "baseline cost is a site metric so not relevant to components." Component-level cost does not exist in current data.

18. **Bold component names** — UX improvement requested by stakeholder.

#### SNAPSHOT 9 — Real Equipment Data (CSR 75349 — HALSALL FIELD)

```
Existing/Proposed | Component           | Type      | Manufacturer | Model              | Location        | Qty | Status
EXISTING          | GPS MODULE          | Pending   | NOKIA        | GPS MODULE         | GANTRY POLE     | 1   | EXISTING
PROPOSED          | Antenna Unit        | Pending   | —            | SUA-3 / (E)        | HEADFRAME       | 3   | PROPOSED
EXISTING          | FPF Rack            | Pending   | NOKIA        | FPF RACK           | GROUND LEVEL    | —   | REMAIN
EXISTING          | Power Supply        | Pending   | ELTEK        | 4TH GEN. PSU       | EQUIPMENT CABIN | —   | ⚠️ UPGRADE
EXISTING          | Meter Cabinet       | Pending   | COMMSCOPE    | SLIMLINE METER CAB | GROUND LEVEL    | —   | REMAIN
PROPOSED          | Radio Unit          | Pending   | NOKIA        | AHEGHA             | HEADFRAME       | 3   | PROPOSED
PROPOSED          | Radio Unit          | Pending   | NOKIA        | AHPMDG 2           | HEADFRAME       | 3   | PROPOSED
PROPOSED          | Antenna Rails       | Pending   | NOKIA        | 584mm AMRC RAILS   | —               | —   | NEW
EXISTING          | Monopole            | Pending   | CU PHOSCO    | PHASE 4.5 MONOPOLE | —               | —   | REMAIN
EXISTING          | Fall Arrest         | Pending   | LATCHWAY     | FALL ARREST        | PHASE 4.5 MONO  | 1   | EXISTING
EXISTING          | Combiner            | Pending   | —            | C2 COMBINER        | FPF RACK        | 3   | EXISTING (REMOVE)
...

NOTE: "Type" column shows "Pending" — will be populated when Master Component DB is ready.
      Blank/None rows from source data are filtered out (22 of 34 rows for this CSR were empty).
      upgrade_required_y_n = 'Y' shown as ⚠️ UPGRADE status.
```

#### SNAPSHOT 10 — Comparable Sites Panel (New)

```
+--------------------------------------------------+
| COMPARABLE SITES                                   |
| Config: SMALL | Vendor: NOKIA | Region: South      |
| Category: Greenfield                               |
+--------------------------------------------------+
| CSR    | Site Name          | Cost    | Components |
| 75349  | HALSALL FIELD      | £1.08   | 15         | ← Current site
| 2774   | —                  | £0.00   | —          |
| 2163   | —                  | —       | —          |
+--------------------------------------------------+
| Avg cost for comparable sites: £0.36              |
| Current site vs avg: +200%                         |
| ⚠️ Cost outlier — review specification             |
+--------------------------------------------------+

NOTE: Comparison matches on: icnirp_config_capacity, manufacturer, 
      deployment_team, site_category from existing data.
      Small sample — accuracy improves with more data ingestion.
```

---

## US2 — Non-Standard Design Detection (UI-Only Changes)

**All data remains mock.** Dashboard labelled accordingly.

#### SNAPSHOT 11 — Tab Structure Change

```
BEFORE: 3 tabs
  [Overview] [Supplier & RF Analysis] [Case Drill-Down]

AFTER: 2 tabs
  [Overview] [Supplier & RF Analysis]
  
  Case Drill-Down tab REMOVED.
  Replaced with expandable row / slide-out panel on Overview table.
  Added "Filter by flag type" dropdown on Overview table.
```

**WHY:** Stakeholder said case drill-down "might be better suited to all CSRs with a given flag" on the overview. Separate tab creates navigation friction.

#### SNAPSHOT 12 — Overview Table Enhancement

```
BEFORE: Clicking row → navigates to Case Drill-Down tab

AFTER: Clicking row → expands inline detail panel showing:
  - Non-conformance details
  - Design version comparison
  - No separate tab navigation needed

New filter above table: [Filter by flag type ▼]
  Options: All | Non-std equipment | Config mismatch | Unapproved vendor | GRP deviation | RF code breach | EOL component

⚠️ ALL DATA IS MOCK — Pending integration with:
  - Master Component Database (defines non-standard flag logic)
  - SiteFlo (provides pending review status and workflow data)
```

#### SNAPSHOT 13 — Supplier & RF Analysis: Non-conformance Types per Supplier

```
BEFORE: Single bar chart showing aggregate non-standard rate (%) per supplier

AFTER: Stacked bar chart showing non-conformance CATEGORIES per supplier
  
  Circet:          [███ Non-std equip ██ Config mismatch █ Unapproved vendor]
  Clarke Telecom:  [██ Non-std equip ███ RF code breach █ GRP deviation]
  ICS:             [█ Non-std equip █ Config mismatch ██ GRP deviation]
  ...

WHY: Stakeholder asked "can we show types of non-conformance per supplier?"
     Rate alone doesn't reveal whether issues are systemic or scattered.
     Category breakdown drives targeted supplier intervention.

⚠️ MOCK DATA — requires Master Component Database for real categorisation.
```

#### SNAPSHOT 14 — Severity Definition (Codified)

```
Current severity labels in chart remain, but definitions are now explicit:

  Critical = Component availability issue OR non-standard component
  Major    = Cost exceeds defined threshold
  Minor    = Everything else

NOTE ON DASHBOARD: "Severity definitions as specified by stakeholder.
  Automated severity assignment requires:
  - Master Component Database (availability data)
  - Cost threshold configuration (not yet defined)"
```

---

## US3 — Design Trend Analysis (Future-State Prototype)

#### SNAPSHOT 15 — Banner Label

```
+=========================================================================+
| ⚠️ FUTURE-STATE PROTOTYPE — NO LIVE DATA                                |
|                                                                          |
| This dashboard represents the target state for design trend analysis.    |
| All metrics shown use illustrative data only.                            |
|                                                                          |
| Prerequisites for activation:                                            |
| 1. SiteFlo integration — MSV pass/fail export                           |
| 2. Defect/issue categorisation system                                    |
| 3. Workflow milestone timestamps (submission → approval)                 |
|                                                                          |
| Status: Awaiting data source confirmation                                |
+=========================================================================+
```

**WHY:** Stakeholder confirmed "no underlying data at the moment, purely anecdotal." Keeping the prototype shows the vision but honest labelling prevents misuse as a reporting tool.

No other changes to US3 content.

---

## Data Gaps Summary

| Gap | Impact | Resolution Path |
|-----|--------|----------------|
| Equipment "Type" field | US1 Tab 2 Type column shows "Pending" | Master Component DB (in progress) |
| Cost decomposition (base/passive/active) | US1 table shows single cost only | Requires new fields in `dwh_site_summary` or cost reference table |
| Non-standard flag logic | All US2 data is mock | Master Component DB (in progress) |
| SiteFlo workflow data | US2 pending review, approval status are mock | SiteFlo API integration needed |
| MSV pass/fail data | All US3 data is mock | SiteFlo or dedicated MSV system |
| Multi-region coverage | Only South/Greenfield sites shown | Larger Dynamo data extract needed |

---

## Implementation Order

| Step | Dashboard | Scope | Effort |
|------|-----------|-------|--------|
| 1 | US1 Tab 1 | Replace KPIs with real data calculations, restructure charts | Large |
| 2 | US1 Tab 2 | Rebuild equipment table with real data, add comparable sites | Medium |
| 3 | US2 | Remove drill-down tab, add expandable rows, stacked supplier chart, mock labels | Medium |
| 4 | US3 | Add future-state banner only | Small |

---

## Awaiting Your Go-Ahead

All changes documented above. Ready to implement when you say so.
