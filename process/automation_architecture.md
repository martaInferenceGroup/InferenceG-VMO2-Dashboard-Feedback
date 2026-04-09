# Dashboard Automation Architecture

## What the User Wants

1. Reviewer comments on dashboard → clicks Submit → dashboard auto-regenerates
2. Client receives dashboard link → reviews → submits feedback → team gets notified
3. Clarifying questions flow back to the reviewer in-dashboard
4. Works at every stage: user story refinement, dashboard creation, dashboard iteration

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Dashboard)                   │
│                                                         │
│  [Feedback Mode] → Comments per visual                  │
│  [Submit Feedback] → POST /api/feedback                 │
│  [View Questions] ← GET /api/questions                  │
│  [Answer Questions] → POST /api/answers                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────────┐
│                 LOCAL SERVER (Node.js)                    │
│                                                         │
│  /api/feedback    → saves JSON → triggers Claude CLI    │
│  /api/questions   → returns pending questions           │
│  /api/answers     → saves answers → triggers next step  │
│  /api/status      → current processing status           │
│  /api/notify      → sends notification (email/webhook)  │
│  /dashboard/:id   → serves dashboard HTML               │
│                                                         │
│  Static file serving for client review (shareable URL)  │
└──────────────────────┬──────────────────────────────────┘
                       │ CLI
┌──────────────────────▼──────────────────────────────────┐
│                   CLAUDE CODE CLI                        │
│                                                         │
│  claude -p "Process feedback from feedback/US1_v5.json  │
│            following process/feedback_system.md"         │
│                                                         │
│  → Reads feedback                                       │
│  → Generates change plan or clarifying questions        │
│  → If questions: writes to questions/US1_pending.json   │
│  → If clear: applies changes, increments version        │
│  → Writes status to status/US1_latest.json              │
└─────────────────────────────────────────────────────────┘
```

## File-Based Communication

```
project/
  feedback/
    US1_v5.0_2026-04-08_marta.json    ← submitted feedback
    US1_v5.0_2026-04-08_client.json   ← client feedback
  questions/
    US1_pending.json                   ← questions waiting for answers
    US1_answered.json                  ← answered questions
  status/
    US1_latest.json                    ← current processing status
  versions/
    US1_v5.0.html                     ← version archive
    US1_v5.1.html                     ← after feedback applied
```

## Notification Options

| Method | Setup | Best For |
|--------|-------|----------|
| Email (nodemailer) | SMTP config | Client notifications |
| Teams webhook | Webhook URL | Team notifications |
| Slack webhook | Webhook URL | Team notifications |
| Browser notification | Built-in | Local reviewer |
| File watcher | Built-in | Claude Code trigger |
