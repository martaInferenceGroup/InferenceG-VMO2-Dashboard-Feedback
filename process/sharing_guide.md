# Sharing Dashboards for Client Review

## Architecture Overview

```
Client (browser)                    You (reviewer)
    │                                    │
    │  https://your-app.railway.app      │
    │  /client → view dashboards         │  / → reviewer hub
    │  /dashboard/US1 → review & comment │  /review → approve/reject/clarify
    │  /new-story → request dashboard    │  /new-story → submit stories
    │                                    │
    └──────────────── Server ────────────┘
                       │
                 Claude Code CLI
                 (processes approved feedback)
```

## Quick Start (Local)

```bash
cd VMO2-Phase2-Dashboards
npm install
cp .env.example .env   # Edit passwords and email settings
npm start
```

Then open http://localhost:3000

## Share Temporarily (Cloudflare Tunnel)

Instant public URL, runs while your machine is on:

```bash
# Install once
npm install -g cloudflared
# or: winget install cloudflare.cloudflared

# Start tunnel
npx cloudflared tunnel --url http://localhost:3000
```

This gives you a URL like `https://abc123.trycloudflare.com` — share it with your client.

## Deploy Permanently (Railway — recommended)

Always-on public URL, free tier available:

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "Initial deploy"
gh repo create vmo2-dashboards --private --source=. --push
```

### 2. Deploy to Railway

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your `vmo2-dashboards` repo
3. Set environment variables in Railway dashboard:
   - `PORT` = `3000` (Railway sets this automatically)
   - `BASE_URL` = `https://your-app.railway.app`
   - `CLIENT_PASSWORD` = (pick a strong password for clients)
   - `REVIEWER_PASSWORD` = (pick a strong password for you)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` = (your email SMTP)
   - `NOTIFY_EMAIL_TO` = your email
4. Railway auto-deploys on every git push

### 3. Share with Client

Send them:
- URL: `https://your-app.railway.app`
- Password: your CLIENT_PASSWORD

They log in, see dashboards, leave comments, submit. You get an email notification.

## Alternative: Render (also free)

1. Go to https://render.com → New Web Service → Connect GitHub
2. Build command: `npm install`
3. Start command: `node server.js`
4. Set environment variables (same as Railway)

## Authentication

Two roles with separate passwords:

| Role | Password Env Var | Access |
|------|-----------------|--------|
| **Client** | `CLIENT_PASSWORD` | View dashboards, leave comments, answer questions, submit stories |
| **Reviewer** | `REVIEWER_PASSWORD` | Everything above + Review Console, approve/reject, trigger Claude |

## Email Notifications

For Gmail:
1. Enable 2FA on your Google account
2. Create an App Password: Google Account → Security → App passwords
3. Use these settings:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=your-email@gmail.com`
   - `SMTP_PASS=your-app-password`

For Outlook/O365:
   - `SMTP_HOST=smtp.office365.com`
   - `SMTP_PORT=587`

## Workflow

### Client Reviews a Dashboard
1. Client opens `/client` → logs in → clicks a dashboard
2. Enables Feedback Mode → comments on visuals → clicks Submit
3. **You get an email notification**
4. You open `/review` → see each comment → Approve / Reject / Add Context
5. Click "Process Approved Changes" → Claude applies changes
6. If Claude has questions → they appear in your Review Console AND in the client's dashboard
7. Once processed → client sees "Updated! Click to reload"

### Client Requests a New Dashboard
1. Client (or you) opens `/new-story` → fills in the form
2. Claude analyses the story and generates clarifying questions
3. Client answers questions at `/story/{id}`
4. Refined story feeds into the Dashboard Factory pipeline

## Webhook Notifications (Teams/Slack)

Set `NOTIFY_WEBHOOK` to your incoming webhook URL:
- **Teams**: Connectors → Incoming Webhook → copy URL
- **Slack**: Apps → Incoming Webhooks → copy URL
