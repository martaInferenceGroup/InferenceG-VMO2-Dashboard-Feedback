"""
VMO2 Dashboard Review Platform

Public client access (no login) — reviewer access via password.
Deploy to Streamlit Community Cloud for a shareable URL.
"""

import streamlit as st
from streamlit_js_eval import streamlit_js_eval
import json
import os
import re
import smtplib
import urllib.request
import urllib.error
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path

# ─── Config ─────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent
FEEDBACK_DIR = ROOT / "feedback"
QUESTIONS_DIR = ROOT / "questions"
STATUS_DIR = ROOT / "status"
STORIES_DIR = ROOT / "stories"
PROTOTYPE_DIR = ROOT / "outputs" / "prototype"
LOGOS_DIR = ROOT / "assets" / "logos"

for d in [FEEDBACK_DIR, QUESTIONS_DIR, STATUS_DIR, STORIES_DIR, LOGOS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

DASHBOARDS = {
    "CO1": {
        "file": "CO1_component_change_impact.html",
        "title": "Component Change Impact Assessment",
        "role": "Central Ops",
        "visuals": [
            "Overall Dashboard",
            "KPI — Avg Changes per Site",
            "KPI — Major Score",
            "KPI — Minor Score",
            "KPI — Sites w/ Flagged Components",
            "KPI — Retention Rate",
            "KPI — Avg Design Version Age",
            "Site Locations Map",
            "Site Status by Region",
            "Config Codes Treemap",
            "Rental Category Movers",
            "Loading Category Investigation",
            "Submissions per Week",
            "All Submissions Table",
        ],
    },
    "CO2": {
        "file": "CO2_nonstandard_design_detection.html",
        "title": "Non-Standard Design Detection",
        "role": "Central Ops",
        "visuals": [
            "Overall Dashboard",
            "KPI — Design Guide Adherence",
            "KPI — Pending Review",
            "KPI — Avg Approval Time",
            "KPI — Most Common RF Code Issue",
            "Flags by Region",
            "Non-Standard Flags by RF Config Code",
            "RF Code Family vs Non-Conformance Heatmap",
            "All Non-Standard Designs Table",
            "Supplier Performance Summary Table",
        ],
    },
    "CO3": {
        "file": "CO3_design_trend_analysis.html",
        "title": "Design Trend & Issue Analysis",
        "role": "Central Ops",
        "visuals": [
            "Overall Dashboard",
            "KPI — MSV Failure Rate",
            "KPI — Rework Rate",
            "KPI — Avg Design Cycle Time",
            "KPI — Total Designs Submitted",
            "KPI — Designs Requiring Rework",
            "KPI — Avg Delay Days",
            "KPI — First-Pass Approval Rate",
            "MSV Failure Rate Trend",
            "Rework Rate Trend",
            "Delay Days by Issue Category",
        ],
    },
    "P1": {
        "file": "P1_purchasing_equipment_pipeline.html",
        "title": "Purchasing Equipment Pipeline",
        "role": "Purchasing",
        "visuals": [
            "Overall Dashboard",
            "KPI — Equipment Volume",
            "KPI — Backorder Rate",
            "KPI — Avg Lead Time",
            "KPI — On-Time Delivery",
            "KPI — Open POs",
            "Forecast vs Actual Demand",
            "Supplier Scorecard",
            "Stock Levels by Equipment Type",
            "Demand Breakdown by Region",
            "PO Status Timeline",
            "Open Purchase Orders",
        ],
    },
    "R1": {
        "file": "R1_equipment_recovery_inventory.html",
        "title": "Equipment Recovery & Inventory",
        "role": "Recovery",
        "visuals": [
            "Overall Dashboard",
            "KPI — Recovery Rate",
            "KPI — Reuse Rate",
            "KPI — Avg Reuse Time",
            "KPI — Value Recovered",
            "KPI — Write-off Rate",
            "Recovery Flow (Sankey-style)",
            "Value Trend — Monthly",
            "Inventory Aging",
            "Recovery by Equipment Type",
            "Recovered Equipment Register",
        ],
    },
    "R2": {
        "file": "R2_recovery_forecasting.html",
        "title": "Recovery Forecasting",
        "role": "Recovery",
        "visuals": [
            "Overall Dashboard",
            "KPI — Forecast Removal Volume",
            "KPI — Reuse Match Rate",
            "KPI — Forecast Accuracy",
            "KPI — Timeline Adherence",
            "Forecast Timeline",
            "Demand vs Recovery Match",
            "Regional Removal Heatmap",
            "Upcoming Removals — Project Pipeline",
        ],
    },
    "QS1": {
        "file": "QS1_qs_cost_validation.html",
        "title": "QS Cost Validation",
        "role": "QS",
        "visuals": [
            "Overall Dashboard",
            "KPI — Sites Over Threshold",
            "KPI — Avg Cost Variance",
            "KPI — Portfolio Overspend",
            "KPI — Sites Within Budget",
            "KPI — Forecast Final Cost",
            "Cost Variance Waterfall",
            "Threshold Tracker",
            "Cost Breakdown by Component Type",
            "Historical Overspend Pattern",
            "Sites Exceeding Threshold",
        ],
    },
    "T1": {
        "file": "T1_transmission_planning.html",
        "title": "Transmission Planning — Dish Rights & Feasibility",
        "role": "Transmission",
        "visuals": [
            "Overall Dashboard",
            "KPI — Total Sites with Dish Rights",
            "KPI — Vacant Dish Rights",
            "KPI — Dish Utilisation",
            "KPI — Avg Available Capacity",
            "KPI — Conflicting Rights",
            "Capacity by Region",
            "Dish Utilisation Trend",
            "Site Map — Dish Right Availability",
            "Dish Rights Register",
            "KPI — Sites Assessed",
            "KPI — High Feasibility",
            "KPI — BT Fibre Sites",
            "KPI — Potential Savings",
            "Feasibility Scoring Distribution",
            "Cost Comparison: Fibre vs Microwave",
            "Feasibility Ranking",
        ],
    },
}

# ─── Helpers ────────────────────────────────────────────────────────────────────


def _html_to_plain(html: str) -> str:
    """Strip HTML tags to plain text for Teams cards."""
    text = html
    text = re.sub(r'<h[23][^>]*>', '\n**', text)
    text = re.sub(r'</h[23]>', '**\n', text)
    text = re.sub(r'<strong>', '**', text)
    text = re.sub(r'</strong>', '**', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<hr\s*/?>', '\n---\n', text)
    text = re.sub(r'<p[^>]*>', '\n', text)
    text = re.sub(r'</p>', '', text)
    text = re.sub(r"<div[^>]*>", "\n> ", text)
    text = re.sub(r'</div>', '', text)
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>[^<]*</a>', r'\1', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text


def _send_teams_webhook(subject: str, body_html: str) -> bool:
    """Post to Microsoft Teams via webhook (supports both Workflows and legacy connectors)."""
    try:
        url = st.secrets["teams"]["webhook_url"]
    except Exception:
        return False

    if not url or url == "PASTE_YOUR_WEBHOOK_URL_HERE":
        return False

    plain = _html_to_plain(body_html)

    # Build a clean, readable card
    body_blocks = [
        {"type": "TextBlock", "text": "VMO2 Dashboard Review", "weight": "Bolder", "size": "Medium", "color": "Accent"},
        {"type": "TextBlock", "text": subject, "weight": "Bolder", "size": "Default", "wrap": True},
        {"type": "ColumnSet", "separator": True, "columns": [
            {"type": "Column", "width": "stretch", "items": [
                {"type": "TextBlock", "text": plain, "wrap": True, "size": "Small"}
            ]}
        ]},
    ]

    payload = json.dumps({
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": body_blocks,
            },
        }],
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        print(f"[Teams] Sent: {subject} (status {resp.status})")
        return True
    except urllib.error.HTTPError:
        legacy = json.dumps({"text": f"**{subject}**\n\n{plain}"}).encode("utf-8")
        req2 = urllib.request.Request(url, data=legacy, headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req2, timeout=10)
            return True
        except Exception:
            pass
        return False
    except Exception as e:
        print(f"[Teams] Failed: {e}")
        return False


def _send_resend(subject: str, body_html: str) -> bool:
    """Send email via Resend.com API (free, 100 emails/day, no Gmail needed)."""
    try:
        cfg = st.secrets["resend"]
        api_key = cfg["api_key"]
        to_email = cfg["notify_to"]
        from_email = cfg.get("from_email", "VMO2 Dashboards <onboarding@resend.dev>")
    except Exception:
        return False

    payload = json.dumps({
        "from": from_email, "to": [to_email],
        "subject": f"[VMO2 Dashboards] {subject}", "html": body_html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails", data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f"[Resend] Failed: {e}")
        return False


def _send_smtp(subject: str, body_html: str) -> bool:
    """Send via SMTP (Gmail, Outlook, company server, etc.)."""
    try:
        cfg = st.secrets["email"]
    except Exception:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[VMO2 Dashboards] {subject}"
    msg["From"] = cfg["smtp_user"]
    msg["To"] = cfg["notify_to"]
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(cfg["smtp_host"], int(cfg["smtp_port"])) as server:
            server.starttls()
            server.login(cfg["smtp_user"], cfg["smtp_pass"])
            server.sendmail(cfg["smtp_user"], cfg["notify_to"], msg.as_string())
        return True
    except Exception as e:
        print(f"[SMTP] Failed: {e}")
        return False


def send_email(subject: str, body_html: str):
    """Try all configured notification channels."""
    sent = False
    sent = _send_teams_webhook(subject, body_html) or sent
    sent = _send_resend(subject, body_html) or sent
    sent = _send_smtp(subject, body_html) or sent
    if not sent:
        print(f"[Notify] No channel configured — notification dropped: {subject}")
    return sent


def save_feedback(dashboard_id: str, version: str, reviewer_name: str, comments: list):
    """Save feedback JSON and notify reviewer."""
    feedback = {
        "dashboard": dashboard_id,
        "version": version,
        "reviewer": reviewer_name,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "timestamp": datetime.now().isoformat(),
        "comments": comments,
        "overall": [c for c in comments if c["visual"] == "Overall Dashboard"],
        "visuals": [
            {"name": c["visual"], "tab": "-", "type": "change", "comment": c["comment"], "priority": "medium"}
            for c in comments if c["visual"] != "Overall Dashboard"
        ],
    }

    safe_name = reviewer_name.replace(" ", "_")
    filename = f"{dashboard_id}_v{version}_{feedback['date']}_{safe_name}.json"
    (FEEDBACK_DIR / filename).write_text(json.dumps(feedback, indent=2))

    status = {
        "dashboard": dashboard_id, "status": "awaiting_review",
        "message": f"Feedback from {reviewer_name} — {len(comments)} comments",
        "feedbackFile": filename, "commentCount": len(comments),
        "timestamp": datetime.now().isoformat(),
    }
    (STATUS_DIR / f"{dashboard_id}_latest.json").write_text(json.dumps(status, indent=2))
    return feedback, filename


def get_status(dashboard_id: str) -> dict:
    f = STATUS_DIR / f"{dashboard_id}_latest.json"
    if f.exists():
        return json.loads(f.read_text())
    return {"status": "idle"}


def get_questions(dashboard_id: str) -> dict | None:
    f = QUESTIONS_DIR / f"{dashboard_id}_pending.json"
    if f.exists():
        return json.loads(f.read_text())
    return None


def list_feedback_files() -> list:
    files = []
    for f in sorted(FEEDBACK_DIR.glob("*.json"), reverse=True):
        if "_review" in f.name or "_reviewed" in f.name:
            continue
        try:
            data = json.loads(f.read_text())
            review_file = FEEDBACK_DIR / f.name.replace(".json", "_review.json")
            # Count comments from both formats
            n = len(data.get("comments", []))
            if n == 0:
                n = len(data.get("overall", [])) + len(data.get("visuals", []))
            files.append({
                "file": f.name, "path": f, "data": data,
                "reviewed": review_file.exists(),
                "dashboard": data.get("dashboard", "?"),
                "reviewer": data.get("reviewer", "anonymous"),
                "date": data.get("date", ""),
                "comment_count": n,
            })
        except Exception:
            pass
    return files


def render_logo(filename: str, width: int = 150):
    """Render a logo from assets/logos/ if it exists."""
    logo_path = LOGOS_DIR / filename
    if logo_path.exists():
        ext = logo_path.suffix.lower()
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml"}.get(ext.lstrip("."), "image/png")
        b64 = base64.b64encode(logo_path.read_bytes()).decode()
        st.markdown(f'<img src="data:{mime};base64,{b64}" width="{width}" style="margin-bottom:8px">', unsafe_allow_html=True)


# ─── Page Config ────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="VMO2 Dashboard Review",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
    .stApp header {visibility: hidden;}
    section[data-testid="stSidebar"] {display: none;}
    .block-container {padding-top: 0 !important; padding-bottom: 0 !important;}
</style>
""", unsafe_allow_html=True)

# ─── Client Authentication Gate ─────────────────────────────────────────────────
# Auth persists via URL parameter so it survives reloads (e.g. after feedback submit).
# Only asks once per browser session. Closing the tab requires re-entry.

try:
    client_pw = st.secrets["client_password"]
except Exception:
    client_pw = "vmo2-client-2026"

# Check if already authenticated via URL param (survives reloads)
query_params = st.query_params
is_authed = query_params.get("auth") == "1"

if "client_auth" not in st.session_state:
    st.session_state.client_auth = is_authed

if not st.session_state.client_auth:
    st.markdown("""
    <div style="background:#1a2d4f;margin:-1rem -1rem 0 -1rem;padding:20px 24px">
      <span style="color:#fff;font-size:18px;font-weight:600">VMO2 Dashboards</span>
      <span style="color:rgba(255,255,255,.5);font-size:12px;margin-left:12px">Review & Feedback Platform</span>
    </div>
    """, unsafe_allow_html=True)
    st.markdown("")
    col_l, col_m, col_r = st.columns([1, 2, 1])
    with col_m:
        st.markdown("### Sign In")
        st.markdown("Enter the access password provided by the Inference Group team.")
        pw_input = st.text_input("Password", type="password", key="client_pw_input")
        if st.button("Sign In", type="primary"):
            if pw_input == client_pw:
                st.session_state.client_auth = True
                st.query_params["auth"] = "1"
                st.rerun()
            else:
                st.error("Incorrect password.")
    st.stop()

# ─── Top Navigation Bar (navy background, white text) ──────────────────────────

st.markdown("""
<div id="vmo2-topbar" style="background:#1a2d4f;margin:-1rem -1rem 0 -1rem;padding:12px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
  <span style="color:#fff;font-size:16px;font-weight:600;margin-right:12px">VMO2 Dashboards</span>
  <span style="color:rgba(255,255,255,.5);font-size:12px;margin-left:auto">Questions? Contact the Inference Group team.</span>
</div>
""", unsafe_allow_html=True)

page = st.radio(
    "Navigate",
    ["View Dashboards", "Request New Dashboard", "Reviewer Panel"],
    horizontal=True,
    label_visibility="collapsed",
)

# ─── PostMessage Listener (for feedback from dashboard iframes) ─────────────
# This tiny zero-height iframe listens on window.parent for messages
# from the dashboard iframe. Both iframes share the same parent (Streamlit main page).
# When feedback arrives, it stores in the PARENT's sessionStorage and reloads.
st.components.v1.html("""
<script>
(function() {
    var p = window.parent;
    if (p && !p._vmo2ListenerAdded) {
        p._vmo2ListenerAdded = true;
        p.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'vmo2_feedback') {
                try {
                    p.sessionStorage.setItem('vmo2_pending_feedback', e.data.data);
                    p.sessionStorage.setItem('vmo2_feedback_submitted', 'true');
                } catch(err) {
                    sessionStorage.setItem('vmo2_pending_feedback', e.data.data);
                    sessionStorage.setItem('vmo2_feedback_submitted', 'true');
                }
                // Reload but preserve the auth param so user stays logged in
                var url = new URL(p.location.href);
                url.searchParams.set('auth', '1');
                url.searchParams.set('fb', Date.now());
                p.location.href = url.toString();
            }
        });
    }
})();
</script>
""", height=0)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: View Dashboards (with inline feedback)
# ═══════════════════════════════════════════════════════════════════════════════

if page == "View Dashboards":
    # Compact header — dashboard selector on one line
    col_sel, col_status = st.columns([3, 2])
    with col_sel:
        selected = st.selectbox(
            "Dashboard",
            list(DASHBOARDS.keys()),
            format_func=lambda k: f"{k} ({DASHBOARDS[k].get('role', '')}) — {DASHBOARDS[k]['title']}",
            label_visibility="collapsed",
        )
    with col_status:
        if selected:
            status = get_status(selected)
            s = status.get("status", "idle")
            icons = {"idle": "🟢", "awaiting_review": "🟡", "processing": "🟡", "questions_pending": "🔴", "complete": "🟢", "error": "🔴"}
            labels = {"idle": "Ready for review", "awaiting_review": "Under review", "processing": "Applying changes", "questions_pending": "Questions for you", "complete": "Updated", "error": "Error"}
            st.caption(f"{icons.get(s, '⚪')} {labels.get(s, s)}")

    if selected:
        info = DASHBOARDS[selected]

        # Show clarifying questions if any (collapsed by default)
        questions = get_questions(selected)
        if questions and questions.get("questions"):
            with st.expander("Claude has questions about your recent feedback", expanded=True):
                with st.form(f"questions_{selected}"):
                    answers = {}
                    for i, q in enumerate(questions["questions"]):
                        st.markdown(f"**Q{i+1}:** {q['question']}")
                        if q.get("context"):
                            st.caption(f"Re: {q['context']}")
                        answers[i] = st.text_area("Your answer", key=f"qa_{selected}_{i}", label_visibility="collapsed")
                    if st.form_submit_button("Submit Answers"):
                        answer_data = {
                            "dashboard": selected,
                            "answers": [{"questionIndex": i, "answer": a} for i, a in answers.items()],
                            "answeredAt": datetime.now().isoformat(),
                        }
                        (QUESTIONS_DIR / f"{selected}_answered.json").write_text(json.dumps(answer_data, indent=2))
                        pending = QUESTIONS_DIR / f"{selected}_pending.json"
                        if pending.exists():
                            pending.unlink()
                        st.success("Answers submitted.")
                        send_email(f"Questions Answered: {selected}", f"<h3>{selected} — Clarifying questions answered</h3>")
                        st.rerun()

        # ─── Render dashboard ────────────────────────────────────────────
        html_path = PROTOTYPE_DIR / info["file"]
        if html_path.exists():
            html = html_path.read_text(encoding="utf-8")

            # Inject: on Submit, send feedback to parent via postMessage
            # The listener installed above (in top bar section) catches it,
            # stores in sessionStorage, and reloads — Python processes on next render.
            feedback_hook = """
<script>
(function() {
  window.exportFeedback = function() {
    if (typeof feedbackData === 'undefined') return;
    feedbackData.reviewer = prompt('Your name:') || 'Anonymous';
    feedbackData.date = new Date().toISOString().split('T')[0];
    var commentCount = (feedbackData.overall||[]).length + (feedbackData.visuals||[]).length;
    if (commentCount === 0) { alert('No comments to submit.'); return; }

    var json = JSON.stringify(feedbackData);

    // Send to parent Streamlit page via postMessage
    try { window.parent.postMessage({type: 'vmo2_feedback', data: json}, '*'); }
    catch(e) { console.warn('postMessage failed', e); }

    // Show success modal (uses the existing showSubmitSuccess from the HTML)
    if (typeof showSubmitSuccess === 'function') {
      showSubmitSuccess(commentCount, feedbackData.reviewer);
    } else {
      alert('Feedback submitted! (' + commentCount + ' comments)');
    }

    // Clear feedback from dashboard
    feedbackData.overall = [];
    feedbackData.visuals = [];
    if (typeof saveFeedback === 'function') saveFeedback();
    if (typeof renderOverallComments === 'function') renderOverallComments();
    if (typeof updateBubbles === 'function') updateBubbles();
  };
})();
</script>
"""
            html = html.replace('</body>', feedback_hook + '\n</body>')
            st.components.v1.html(html, height=2400, scrolling=True)
        else:
            st.error(f"Dashboard file not found: {info['file']}")

        # ─── Process feedback from sessionStorage (after reload) ─────────
        # The postMessage listener saves to parent's sessionStorage and reloads.
        # On this render, we read from parent sessionStorage (or own as fallback).
        feedback_result = streamlit_js_eval(
            js_expressions="""(function(){
                var s = null;
                try { s = window.parent.sessionStorage; } catch(e) { s = sessionStorage; }
                var f = s.getItem('vmo2_feedback_submitted');
                if (f === 'true') {
                    var d = s.getItem('vmo2_pending_feedback');
                    s.removeItem('vmo2_feedback_submitted');
                    s.removeItem('vmo2_pending_feedback');
                    return d;
                }
                return null;
            })()""",
            key=f"read_fb_{selected}",
        )
        if feedback_result and isinstance(feedback_result, str) and feedback_result.strip().startswith("{"):
            try:
                fb = json.loads(feedback_result)
                reviewer = fb.get("reviewer", "Anonymous")
                dashboard_id = fb.get("dashboard", selected)
                n_overall = len(fb.get("overall", []))
                n_visuals = len(fb.get("visuals", []))
                n_total = n_overall + n_visuals

                if n_total > 0:
                    # Save to feedback/ directory
                    save_feedback(dashboard_id, fb.get("version", "5.0"), reviewer,
                        [{"visual": "Overall Dashboard", "comment": c.get("comment", "")} for c in fb.get("overall", [])] +
                        [{"visual": v.get("name", "Unknown"), "comment": v.get("comment", "")} for v in fb.get("visuals", [])]
                    )

                    # Send readable Teams notification
                    comment_lines = []
                    for c in fb.get("overall", []):
                        comment_lines.append(f"<p><strong>[Overall Dashboard]</strong><br>{c.get('comment', '')}</p>")
                    for v in fb.get("visuals", []):
                        comment_lines.append(f"<p><strong>[{v.get('name', '?')}]</strong><br>{v.get('comment', '')}</p>")

                    send_email(
                        f"New Feedback: {dashboard_id} — {n_total} comments from {reviewer}",
                        f"<h2>Dashboard Feedback Received</h2>"
                        f"<p><strong>Dashboard:</strong> {dashboard_id} — {info['title']}</p>"
                        f"<p><strong>Submitted by:</strong> {reviewer}</p>"
                        f"<p><strong>Date:</strong> {datetime.now().strftime('%d %b %Y, %H:%M')}</p>"
                        f"<hr>"
                        f"<h3>Comments ({n_total}):</h3>"
                        + "\n".join(comment_lines)
                        + f"<hr>"
                        f"<p><em>Open the Reviewer Panel to approve or reject each comment.</em></p>",
                    )

                    st.toast(f"Feedback from {reviewer} saved and notification sent ({n_total} comments).")
            except json.JSONDecodeError:
                pass


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: Request New Dashboard
# ═══════════════════════════════════════════════════════════════════════════════

elif page == "Request New Dashboard":
    st.title("Request a New Dashboard")
    st.markdown(
        "Describe what you need. The team will review your story, ask clarifying questions, "
        "and build a dashboard prototype."
    )

    # Check for existing stories with pending questions
    existing_stories = list(STORIES_DIR.glob("*.json"))
    if existing_stories:
        st.markdown("### Your Stories")
        for sf in sorted(existing_stories, reverse=True):
            try:
                story = json.loads(sf.read_text())
                q_file = QUESTIONS_DIR / f"story_{story['id']}_pending.json"
                has_questions = q_file.exists()

                with st.expander(
                    f"{'🔴' if has_questions else '🟢'} {story.get('title', sf.stem)} — {story.get('submittedAt', '')[:10]}",
                    expanded=has_questions,
                ):
                    st.markdown(f"**As a** {story.get('role', '-')}")
                    st.markdown(f"**I want to** {story.get('want', '-')}")
                    st.markdown(f"**So that** {story.get('soThat', '-')}")

                    if has_questions:
                        questions = json.loads(q_file.read_text())
                        st.warning("The team has questions about your story:")
                        with st.form(f"story_q_{story['id']}"):
                            answers = {}
                            for i, q in enumerate(questions.get("questions", [])):
                                st.markdown(f"**Q{i+1}:** {q['question']}")
                                if q.get("why"):
                                    st.caption(f"Why this matters: {q['why']}")
                                if q.get("suggestion"):
                                    st.caption(f"Suggested default: {q['suggestion']}")
                                answers[i] = st.text_area("Answer", key=f"sq_{story['id']}_{i}", label_visibility="collapsed")
                            if st.form_submit_button("Submit Answers"):
                                answer_data = {
                                    "storyId": story["id"],
                                    "answers": [{"questionIndex": i, "answer": a} for i, a in answers.items()],
                                    "answeredAt": datetime.now().isoformat(),
                                }
                                (QUESTIONS_DIR / f"story_{story['id']}_answered.json").write_text(json.dumps(answer_data, indent=2))
                                q_file.unlink()
                                st.success("Answers submitted.")
                                send_email(f"Story Questions Answered: {story['id']}", f"<p>Client answered clarifying questions for story <strong>{story.get('title', story['id'])}</strong>.</p>")
                                st.rerun()
            except Exception:
                pass

        st.markdown("---")

    st.markdown("### Submit a New Story")

    with st.form("new_story"):
        title = st.text_input("Story title", placeholder="e.g. Equipment Lifecycle Cost Analysis")
        role = st.text_input("As a... (your role)", placeholder="e.g. Network Planning Manager")
        want = st.text_area("I want to... (what you need to see/do)", placeholder="e.g. View equipment costs by region, identify anomalies, track replacement schedules")
        so_that = st.text_area("So that... (what decision/outcome this enables)", placeholder="e.g. I can make informed procurement decisions and plan replacement budgets")
        kpis = st.text_area("Key metrics / KPIs (if known)", placeholder="e.g. Total cost per site, supplier cost comparison, replacement cycle time")
        data_sources = st.text_area("Data sources (if known)", placeholder="e.g. Dynamo equipment data, rental costs CSV, supplier contracts")
        context = st.text_area("Additional context", placeholder="Audience, frequency of use, existing reports this replaces, priority...")

        if st.form_submit_button("Submit Story", type="primary"):
            if not title.strip() or not want.strip():
                st.warning("Please fill in at least the title and 'I want to' fields.")
            else:
                story_id = f"US{datetime.now().strftime('%y%m%d%H%M')}"
                story = {
                    "id": story_id, "title": title, "role": role, "want": want,
                    "soThat": so_that, "kpis": kpis, "dataSources": data_sources,
                    "context": context, "submittedBy": "client",
                    "submittedAt": datetime.now().isoformat(), "status": "submitted",
                }
                (STORIES_DIR / f"{story_id}.json").write_text(json.dumps(story, indent=2))

                send_email(
                    f"New Dashboard Request: {title}",
                    f"""<h2>New User Story Submitted</h2>
                    <p><strong>ID:</strong> {story_id}</p>
                    <p><strong>Title:</strong> {title}</p>
                    <p><strong>As a</strong> {role}, <strong>I want to</strong> {want}, <strong>so that</strong> {so_that}</p>
                    {f'<p><strong>KPIs:</strong> {kpis}</p>' if kpis else ''}
                    {f'<p><strong>Data:</strong> {data_sources}</p>' if data_sources else ''}
                    {f'<p><strong>Context:</strong> {context}</p>' if context else ''}
                    <hr><p style='color:#757575'>Story ID: {story_id}</p>""",
                )

                st.success(f"Story submitted (ID: {story_id}). The team will review it and may ask clarifying questions — check back here.")
                st.balloons()
                st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE: Reviewer Panel (password protected)
# This is where YOU (Marta) review client feedback before Claude processes it.
# ═══════════════════════════════════════════════════════════════════════════════

elif page == "Reviewer Panel":
    st.title("Reviewer Panel")

    try:
        correct_pw = st.secrets["reviewer_password"]
    except Exception:
        correct_pw = "reviewer-admin-2026"

    if "reviewer_auth" not in st.session_state:
        st.session_state.reviewer_auth = False

    if not st.session_state.reviewer_auth:
        st.markdown("This panel is for the internal team to review and approve client feedback before changes are applied.")
        pw = st.text_input("Reviewer password", type="password")
        if st.button("Sign In"):
            if pw == correct_pw:
                st.session_state.reviewer_auth = True
                st.rerun()
            else:
                st.error("Incorrect password.")
        st.stop()

    # ─── Reviewer is authenticated ───

    st.caption("Review client feedback, approve/reject every comment, then submit to Claude for dashboard regeneration.")

    tab_feedback, tab_stories, tab_versions, tab_status = st.tabs(
        ["Feedback Review", "Story Requests", "Version Management", "Dashboard Status"]
    )

    # ─── Tab: Feedback Review ───

    with tab_feedback:
        # Filter by dashboard
        fb_dashboard = st.selectbox(
            "Filter by dashboard",
            ["All"] + list(DASHBOARDS.keys()),
            key="fb_filter_dash",
        )

        feedback_files = list_feedback_files()
        if fb_dashboard != "All":
            feedback_files = [f for f in feedback_files if f["dashboard"] == fb_dashboard]

        if not feedback_files:
            st.info("No feedback submitted yet. When clients submit comments on dashboards, they'll appear here.")
        else:
            selected_file = st.selectbox(
                "Select feedback to review",
                feedback_files,
                format_func=lambda f: f"{f['dashboard']} — {f['reviewer']} ({f['comment_count']} comments, {f['date']}) {'✅ REVIEWED' if f['reviewed'] else '⏳ PENDING'}",
            )

            if selected_file:
                data = selected_file["data"]
                dashboard_id = data.get("dashboard", "?")
                comments = data.get("comments", [])
                if not comments:
                    comments = [
                        {"visual": "Overall Dashboard", "comment": c.get("comment", "")}
                        for c in data.get("overall", [])
                    ] + [
                        {"visual": v.get("name", "Unknown"), "comment": v.get("comment", "")}
                        for v in data.get("visuals", [])
                    ]

                if not comments:
                    st.info("No comments in this file.")
                else:
                    review_key = f"review_{selected_file['file']}"
                    if review_key not in st.session_state:
                        review_file = FEEDBACK_DIR / selected_file["file"].replace(".json", "_review.json")
                        if review_file.exists():
                            try:
                                rd = json.loads(review_file.read_text())
                                st.session_state[review_key] = rd.get("decisions", {})
                            except Exception:
                                st.session_state[review_key] = {}
                        else:
                            st.session_state[review_key] = {}

                    decisions = st.session_state[review_key]

                    # Stats
                    cols = st.columns(5)
                    n_total = len(comments)
                    n_approved = sum(1 for d in decisions.values() if d.get("status") == "approved")
                    n_rejected = sum(1 for d in decisions.values() if d.get("status") == "rejected")
                    n_clarified = sum(1 for d in decisions.values() if d.get("status") == "clarified")
                    n_pending = n_total - n_approved - n_rejected - n_clarified

                    cols[0].metric("Total", n_total)
                    cols[1].metric("Pending", n_pending)
                    cols[2].metric("Approved", n_approved)
                    cols[3].metric("Rejected", n_rejected)
                    cols[4].metric("Clarified", n_clarified)

                    st.markdown("---")

                    if st.button("Approve All Pending"):
                        for i in range(len(comments)):
                            k = str(i)
                            if k not in decisions or decisions[k].get("status") == "pending":
                                decisions[k] = {"status": "approved", "note": ""}
                        st.session_state[review_key] = decisions
                        st.rerun()

                    # Render each comment — reviewer MUST assign an action to each
                    for i, c in enumerate(comments):
                        k = str(i)
                        d = decisions.get(k, {"status": "pending", "note": ""})
                        status_icons = {"approved": "🟢", "rejected": "🔴", "clarified": "🔵", "pending": "🟡"}

                        st.markdown(f"**{status_icons.get(d['status'], '⚪')} {c['visual']}**")
                        st.markdown(f"> {c['comment']}")

                        col_a, col_b, col_c, col_d = st.columns(4)
                        with col_a:
                            if st.button("Approve", key=f"approve_{i}", type="primary" if d["status"] == "approved" else "secondary"):
                                decisions[k] = {"status": "approved", "note": d.get("note", "")}
                                st.rerun()
                        with col_b:
                            if st.button("Reject", key=f"reject_{i}", type="primary" if d["status"] == "rejected" else "secondary"):
                                decisions[k] = {"status": "rejected", "note": d.get("note", "")}
                                st.rerun()
                        with col_c:
                            if st.button("Clarify", key=f"clarify_{i}", type="primary" if d["status"] == "clarified" else "secondary"):
                                decisions[k] = {"status": "clarified", "note": d.get("note", "")}
                                st.rerun()
                        with col_d:
                            note = st.text_input("Note", value=d.get("note", ""), key=f"note_{i}", label_visibility="collapsed", placeholder="Add context for Claude...")
                            if note != d.get("note", ""):
                                decisions[k]["note"] = note

                        st.markdown("---")

                    # Auto-save review decisions
                    review_save = {"file": selected_file["file"], "decisions": decisions, "reviewer": "internal", "date": datetime.now().isoformat()}
                    review_path = FEEDBACK_DIR / selected_file["file"].replace(".json", "_review.json")
                    review_path.write_text(json.dumps(review_save, indent=2))

                    # ─── Submit to Claude ─────────────────────────────────
                    # ALL comments must have an action before submitting
                    if n_pending > 0:
                        st.warning(f"{n_pending} comment(s) still need an action (approve, reject, or clarify). Every comment must have a decision before submitting.")
                    else:
                        n_actionable = n_approved + n_clarified
                        if n_actionable == 0:
                            st.info("All comments were rejected. Nothing to submit to Claude.")
                        else:
                            st.success(f"All comments reviewed. **{n_actionable}** approved/clarified, **{n_rejected}** rejected.")

                            if st.button("Submit to Claude for Dashboard Regeneration", type="primary"):
                                # Build the filtered feedback with only approved/clarified items
                                filtered = {
                                    "dashboard": dashboard_id,
                                    "version": data.get("version", "5.0"),
                                    "originalReviewer": data.get("reviewer", ""),
                                    "internalReviewer": "Reviewer",
                                    "reviewDate": datetime.now().strftime("%Y-%m-%d"),
                                    "overall": [],
                                    "visuals": [],
                                }

                                for i, c in enumerate(comments):
                                    d = decisions.get(str(i), {})
                                    if d.get("status") in ("approved", "clarified"):
                                        entry = {**c, "reviewStatus": d["status"], "reviewNote": d.get("note", "")}
                                        if c["visual"] == "Overall Dashboard":
                                            filtered["overall"].append(entry)
                                        else:
                                            filtered["visuals"].append(entry)

                                # Save reviewed feedback
                                fname = f"{dashboard_id}_reviewed_{datetime.now().strftime('%Y-%m-%d_%H%M')}.json"
                                (FEEDBACK_DIR / fname).write_text(json.dumps(filtered, indent=2))

                                # Archive current dashboard version before regeneration
                                dash_info = DASHBOARDS.get(dashboard_id)
                                if dash_info:
                                    current_html = PROTOTYPE_DIR / dash_info["file"]
                                    if current_html.exists():
                                        version = data.get("version", "5.0")
                                        archive_name = f"{dashboard_id}_v{version}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                                        VERSIONS_DIR = ROOT / "versions"
                                        VERSIONS_DIR.mkdir(exist_ok=True)
                                        import shutil
                                        shutil.copy2(current_html, VERSIONS_DIR / archive_name)

                                # Build the Claude prompt
                                change_summary = []
                                for entry in filtered["overall"]:
                                    note_text = f" (Reviewer note: {entry['reviewNote']})" if entry.get("reviewNote") else ""
                                    change_summary.append(f"- [Overall] {entry['comment']}{note_text}")
                                for entry in filtered["visuals"]:
                                    note_text = f" (Reviewer note: {entry['reviewNote']})" if entry.get("reviewNote") else ""
                                    change_summary.append(f"- [{entry.get('visual', '?')}] {entry['comment']}{note_text}")

                                claude_prompt = (
                                    f"Process the reviewed feedback for dashboard {dashboard_id}.\n\n"
                                    f"Feedback file: feedback/{fname}\n"
                                    f"Dashboard file: outputs/prototype/{dash_info['file'] if dash_info else dashboard_id + '.html'}\n"
                                    f"Process rules: process/dashboard_factory.md\n"
                                    f"Feedback system: process/feedback_system.md\n\n"
                                    f"Approved changes ({n_actionable}):\n"
                                    + "\n".join(change_summary) + "\n\n"
                                    f"Rejected comments ({n_rejected}) — do NOT apply these.\n\n"
                                    f"Instructions:\n"
                                    f"1. Read the dashboard HTML and the feedback file\n"
                                    f"2. Apply ONLY the approved/clarified changes listed above\n"
                                    f"3. Follow all Dashboard Factory rules (no pie charts, info icons on every visual, etc.)\n"
                                    f"4. Increment the version number in the dashboard\n"
                                    f"5. Update status/{{dashboard_id}}_latest.json when done"
                                )

                                # Update status
                                status_data = {
                                    "dashboard": dashboard_id,
                                    "status": "processing",
                                    "message": f"{n_actionable} changes submitted for regeneration",
                                    "feedbackFile": fname,
                                    "timestamp": datetime.now().isoformat(),
                                }
                                (STATUS_DIR / f"{dashboard_id}_latest.json").write_text(json.dumps(status_data, indent=2))

                                # Notify via Teams
                                send_email(
                                    f"Dashboard Regeneration: {dashboard_id} — {n_actionable} changes submitted",
                                    f"<h2>Dashboard Regeneration Triggered</h2>"
                                    f"<p><strong>Dashboard:</strong> {dashboard_id}</p>"
                                    f"<p><strong>Changes:</strong> {n_actionable} approved, {n_rejected} rejected</p>"
                                    f"<p><strong>Previous version archived.</strong></p>"
                                    f"<hr><h3>Changes to apply:</h3>"
                                    + "".join(f"<p>{line}</p>" for line in change_summary)
                                    + f"<hr><p><em>Run the Claude prompt below in Claude Code to regenerate.</em></p>",
                                )

                                st.success("Submitted for regeneration. Previous version archived.")
                                st.markdown("**Run this in Claude Code to regenerate the dashboard:**")
                                st.code(claude_prompt, language=None)

    # ─── Tab: Story Requests ───

    with tab_stories:
        stories = list(STORIES_DIR.glob("*.json"))
        if not stories:
            st.info("No story requests yet.")
        else:
            for sf in sorted(stories, reverse=True):
                try:
                    story = json.loads(sf.read_text())
                    answered_file = QUESTIONS_DIR / f"story_{story['id']}_answered.json"
                    has_answers = answered_file.exists()

                    with st.expander(f"{'📩' if has_answers else '📝'} {story.get('title', sf.stem)} — {story.get('submittedBy', '?')} ({story.get('submittedAt', '')[:10]})"):
                        st.markdown(f"**As a** {story.get('role', '-')}")
                        st.markdown(f"**I want to** {story.get('want', '-')}")
                        st.markdown(f"**So that** {story.get('soThat', '-')}")
                        if story.get("kpis"):
                            st.markdown(f"**KPIs:** {story['kpis']}")
                        if story.get("dataSources"):
                            st.markdown(f"**Data:** {story['dataSources']}")
                        if story.get("context"):
                            st.markdown(f"**Context:** {story['context']}")

                        if has_answers:
                            answers = json.loads(answered_file.read_text())
                            st.success("Client has answered clarifying questions:")
                            for a in answers.get("answers", []):
                                st.markdown(f"- **A{a['questionIndex']+1}:** {a['answer']}")

                        st.markdown("---")
                        st.markdown(
                            "To process this story through the Dashboard Factory, run in Claude Code:\n\n"
                            f"```\nProcess the user story at stories/{sf.name} through the Dashboard Factory pipeline (process/dashboard_factory.md)\n```"
                        )
                except Exception:
                    pass

    # ─── Tab: Version Management (reviewer only) ───

    with tab_versions:
        st.markdown("### Dashboard Versions")
        st.caption("Previous versions are archived before each regeneration. Only reviewers can delete old versions.")

        VERSIONS_DIR = ROOT / "versions"
        VERSIONS_DIR.mkdir(exist_ok=True)

        # Group by dashboard
        version_files = sorted(VERSIONS_DIR.glob("*.html"), reverse=True)

        if not version_files:
            st.info("No archived versions yet. Versions are created automatically when a dashboard is submitted for regeneration.")
        else:
            # Group by dashboard ID
            by_dashboard = {}
            for vf in version_files:
                did = vf.name.split("_")[0]
                by_dashboard.setdefault(did, []).append(vf)

            for did, files in sorted(by_dashboard.items()):
                dash_title = DASHBOARDS.get(did, {}).get("title", did)
                with st.expander(f"{did} — {dash_title} ({len(files)} versions)", expanded=False):
                    # Show current live version
                    current_file = PROTOTYPE_DIR / DASHBOARDS.get(did, {}).get("file", "")
                    if current_file.exists():
                        mod_time = datetime.fromtimestamp(current_file.stat().st_mtime)
                        st.markdown(f"**Current live version:** last modified {mod_time.strftime('%d %b %Y, %H:%M')}")

                    st.markdown("**Archived versions:**")
                    for vf in files:
                        col_name, col_size, col_action = st.columns([4, 1, 1])
                        file_size = vf.stat().st_size / 1024
                        col_name.markdown(f"`{vf.name}`")
                        col_size.caption(f"{file_size:.0f} KB")
                        with col_action:
                            if st.button("Delete", key=f"del_{vf.name}", type="secondary"):
                                vf.unlink()
                                st.toast(f"Deleted {vf.name}")
                                st.rerun()

                    # Restore option
                    st.markdown("---")
                    restore_file = st.selectbox(
                        "Restore a previous version",
                        [None] + files,
                        format_func=lambda f: "Select version to restore..." if f is None else f.name,
                        key=f"restore_{did}",
                    )
                    if restore_file and st.button(f"Restore {restore_file.name} as live version", key=f"restore_btn_{did}"):
                        import shutil
                        target = PROTOTYPE_DIR / DASHBOARDS[did]["file"]
                        # Archive current before restoring
                        if target.exists():
                            archive_name = f"{did}_pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                            shutil.copy2(target, VERSIONS_DIR / archive_name)
                        shutil.copy2(restore_file, target)
                        st.success(f"Restored `{restore_file.name}` as the live version of {did}. Previous version archived.")
                        st.rerun()

    # ─── Tab: Dashboard Status ───

    with tab_status:
        for did, info in DASHBOARDS.items():
            status = get_status(did)
            s = status.get("status", "idle")
            status_icons = {"idle": "🟢", "awaiting_review": "🟡", "processing": "🟡", "questions_pending": "🔴", "complete": "🟢", "error": "🔴"}

            col1, col2, col3 = st.columns([2, 2, 1])
            col1.markdown(f"**{did}** — {info['title']}")
            col2.markdown(f"{status_icons.get(s, '⚪')} {s}")
            col3.caption(status.get("timestamp", "-")[:16])

            if s == "questions_pending":
                questions = get_questions(did)
                if questions and questions.get("questions"):
                    st.warning(f"Claude is waiting for answers on {did}")
                    for q in questions["questions"]:
                        st.markdown(f"- {q['question']}")
