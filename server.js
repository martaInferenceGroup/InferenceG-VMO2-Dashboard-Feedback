/**
 * VMO2 Dashboard Review & Automation Server
 *
 * Features:
 *   - Role-based auth (client vs reviewer)
 *   - Dashboard serving with in-browser feedback
 *   - Approval workflow: client submits → reviewer approves → Claude processes
 *   - Clarifying questions loop (Claude ↔ client/reviewer)
 *   - Email + webhook notifications
 *   - User story intake with question flow
 *   - Cloud-deployable (Railway, Render, etc.)
 *
 * Usage:
 *   npm start
 *   Open http://localhost:3000
 *
 * Environment variables: see .env.example
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

// ─── Config ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const PROJECT_ROOT = __dirname;
const CLAUDE_CMD = process.env.CLAUDE_CMD || 'claude';

const DIRS = {
  feedback: path.join(PROJECT_ROOT, 'feedback'),
  questions: path.join(PROJECT_ROOT, 'questions'),
  status: path.join(PROJECT_ROOT, 'status'),
  versions: path.join(PROJECT_ROOT, 'versions'),
  prototype: path.join(PROJECT_ROOT, 'outputs', 'prototype'),
  stories: path.join(PROJECT_ROOT, 'stories'),
};

Object.values(DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Auth ──────────────────────────────────────────────────────────────────────

const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || 'client-review-2026';
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD || 'reviewer-admin-2026';

// Active sessions: token → { role, created }
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authenticate(req) {
  // Check cookie
  const cookies = parseCookies(req);
  const token = cookies.session;
  if (token && sessions.has(token)) {
    return sessions.get(token);
  }
  // Check Authorization header (for API calls)
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ') && sessions.has(auth.slice(7))) {
    return sessions.get(auth.slice(7));
  }
  return null;
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = v;
  });
  return cookies;
}

function requireAuth(req, res, requiredRole) {
  const session = authenticate(req);
  if (!session) {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return null;
  }
  if (requiredRole && session.role !== requiredRole) {
    sendJSON(res, { error: 'Insufficient permissions' }, 403);
    return null;
  }
  return session;
}

// ─── Email Notifications ───────────────────────────────────────────────────────

let transporter = null;

function initEmail() {
  if (!process.env.SMTP_HOST) return;
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[Email] Configured with', process.env.SMTP_HOST);
  } catch (e) {
    console.log('[Email] nodemailer not available, email disabled');
  }
}

async function sendEmail(subject, html) {
  if (!transporter || !process.env.NOTIFY_EMAIL_TO) return;
  try {
    await transporter.sendMail({
      from: process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL_TO,
      subject: `[VMO2 Dashboards] ${subject}`,
      html,
    });
    console.log('[Email] Sent:', subject);
  } catch (e) {
    console.error('[Email] Failed:', e.message);
  }
}

// ─── Webhook Notifications ─────────────────────────────────────────────────────

function sendWebhook(message) {
  const webhookUrl = process.env.NOTIFY_WEBHOOK;
  if (!webhookUrl) return;

  const payload = JSON.stringify({ text: message, body: { content: message } });
  const url = new URL(webhookUrl);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  };

  const protocol = url.protocol === 'https:' ? require('https') : http;
  const req = protocol.request(options, () => {});
  req.on('error', err => console.error('[Webhook error]', err.message));
  req.write(payload);
  req.end();
}

// Unified notify: console + webhook + email
function notify(message, emailSubject, emailHtml) {
  console.log('[Notify]', message);
  sendWebhook(message);
  if (emailSubject) sendEmail(emailSubject, emailHtml || `<p>${message}</p>`);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.csv': 'text/csv', '.md': 'text/markdown',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function getMime(fp) { return MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream'; }

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}

function setStatus(dashboardId, status, details = {}) {
  const file = path.join(DIRS.status, `${dashboardId}_latest.json`);
  const data = { dashboard: dashboardId, status, timestamp: new Date().toISOString(), ...details };
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return data;
}

function getDashboardFilename(id) {
  const map = {
    US1: 'US1_component_change_impact.html',
    US2: 'US2_nonstandard_design_detection.html',
    US3: 'US3_design_trend_analysis.html',
  };
  return map[id] || `${id}.html`;
}

// ─── Claude Integration ────────────────────────────────────────────────────────

function triggerClaude(dashboardId, feedbackFile) {
  setStatus(dashboardId, 'processing', { message: 'Claude is reviewing feedback...' });

  const feedbackPath = path.relative(PROJECT_ROOT, feedbackFile).replace(/\\/g, '/');
  const prompt = `You are processing dashboard feedback. Follow process/feedback_system.md strictly.

Read the feedback file at: ${feedbackPath}
Read the dashboard at: outputs/prototype/${getDashboardFilename(dashboardId)}
Read the process rules at: process/dashboard_factory.md

STEP 1: Parse every comment. For each one determine:
- Is it actionable (clear change to implement)?
- Does it need clarification (ambiguous)?
- Does it conflict with Dashboard Factory rules?

STEP 2: If ANY comments need clarification, write a questions file:
Save to questions/${dashboardId}_pending.json with format:
{
  "dashboard": "${dashboardId}",
  "targetRole": "client",
  "questions": [
    { "id": "q1", "about": "visual-id or overall", "question": "...", "context": "original comment", "answered": false }
  ]
}
Then STOP. Do not modify the dashboard until questions are answered.

STEP 3: If ALL comments are clear, apply the changes:
- Modify the dashboard HTML file directly
- Update the version number (increment minor version)
- Archive the previous version to versions/
- Update info icons on affected visuals
- Write completion status to status/${dashboardId}_latest.json

STEP 4: Write a summary of what was changed to status/${dashboardId}_latest.json:
{
  "dashboard": "${dashboardId}",
  "status": "complete",
  "version": "new version number",
  "changes": ["list of changes made"],
  "timestamp": "ISO date"
}`;

  const claudeCmd = `${CLAUDE_CMD} -p "${prompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  console.log(`[Claude] Processing feedback for ${dashboardId}...`);

  exec(claudeCmd, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Claude] Error:`, error.message);
      setStatus(dashboardId, 'error', { message: error.message });
      notify(`Dashboard ${dashboardId} processing failed: ${error.message}`,
        `Processing Failed: ${dashboardId}`,
        `<h3>Dashboard ${dashboardId} — Processing Failed</h3><p>${error.message}</p>`);
      return;
    }

    console.log(`[Claude] Output:`, stdout.substring(0, 500));

    const questionsFile = path.join(DIRS.questions, `${dashboardId}_pending.json`);
    if (fs.existsSync(questionsFile)) {
      setStatus(dashboardId, 'questions_pending', { message: 'Clarifying questions need answers' });
      notify(`Dashboard ${dashboardId}: Claude has clarifying questions`,
        `Clarifying Questions: ${dashboardId}`,
        `<h3>Dashboard ${dashboardId}</h3><p>Claude needs clarification before applying changes.</p><p><a href="${BASE_URL}/dashboard/${dashboardId}">View Dashboard</a> | <a href="${BASE_URL}/review">Review Console</a></p>`);
    } else {
      setStatus(dashboardId, 'complete', { message: 'Changes applied successfully' });
      notify(`Dashboard ${dashboardId}: Changes applied successfully`,
        `Changes Applied: ${dashboardId}`,
        `<h3>Dashboard ${dashboardId}</h3><p>All approved changes have been applied.</p><p><a href="${BASE_URL}/dashboard/${dashboardId}">View Updated Dashboard</a></p>`);
    }
  });
}

function triggerStoryAnalysis(storyId) {
  setStatus(`story_${storyId}`, 'processing', { message: 'Claude is analysing the user story...' });

  const storyFile = path.join(DIRS.stories, `${storyId}.json`);
  const prompt = `You are the Story Analyst agent. Follow process/agent_prompts.md (Story Analyst section) and process/dashboard_factory.md.

Read the user story submission at: stories/${storyId}.json
Read the process: process/dashboard_factory.md
Read the agent prompts: process/agent_prompts.md

STEP 1: Analyse the story for completeness. Check:
- Are KPIs clearly defined with formulas?
- Are data sources identified?
- Are user roles and decisions specified?
- Are there ambiguities that need resolving?

STEP 2: Write clarifying questions to questions/story_${storyId}_pending.json:
{
  "storyId": "${storyId}",
  "targetRole": "client",
  "phase": "story_refinement",
  "questions": [
    { "id": "q1", "category": "kpi|data|scope|user|priority", "question": "...", "why": "reason this matters", "suggestion": "proposed default if no answer", "answered": false }
  ]
}

STEP 3: Write initial analysis to status/story_${storyId}_latest.json:
{
  "storyId": "${storyId}",
  "status": "questions_pending",
  "phase": "story_refinement",
  "completenessScore": "percentage",
  "summary": "brief analysis",
  "timestamp": "ISO date"
}`;

  const claudeCmd = `${CLAUDE_CMD} -p "${prompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
  console.log(`[Claude] Analysing story ${storyId}...`);

  exec(claudeCmd, { cwd: PROJECT_ROOT, maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
    if (error) {
      console.error(`[Claude] Story error:`, error.message);
      setStatus(`story_${storyId}`, 'error', { message: error.message });
      return;
    }
    console.log(`[Claude] Story output:`, stdout.substring(0, 500));
    notify(`New user story "${storyId}" analysed — clarifying questions generated`,
      `New Story: ${storyId}`,
      `<h3>New User Story: ${storyId}</h3><p>Claude has analysed the story and generated clarifying questions.</p><p><a href="${BASE_URL}/story/${storyId}">View & Answer Questions</a></p>`);
  });
}

// ─── Login Page ────────────────────────────────────────────────────────────────

function loginPage(error = '') {
  const errorHtml = error ? `<div style="background:#fee2e2;color:#991b1b;padding:8px 12px;border-radius:4px;font-size:12px;margin-bottom:16px">${error}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VMO2 Dashboard Review — Login</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f1f3f4;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:40px;width:380px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.logo{text-align:center;margin-bottom:24px}
.logo h1{font-size:20px;color:#1a2d4f;font-weight:600}
.logo p{font-size:12px;color:#757575;margin-top:4px}
label{font-size:12px;color:#333;display:block;margin-bottom:4px;font-weight:500}
input{width:100%;padding:10px 12px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;margin-bottom:16px;font-family:inherit}
input:focus{outline:none;border-color:#1a2d4f;box-shadow:0 0 0 2px rgba(26,45,79,.1)}
button{width:100%;padding:12px;background:#1a2d4f;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit}
button:hover{background:#243a5e}
.hint{font-size:11px;color:#757575;text-align:center;margin-top:16px;line-height:1.5}
</style></head><body>
<div class="card">
  <div class="logo"><h1>VMO2 Dashboards</h1><p>Dashboard Review & Feedback Platform</p></div>
  ${errorHtml}
  <form method="POST" action="/login">
    <label>Your Name</label>
    <input type="text" name="name" placeholder="e.g. John Smith" required>
    <label>Access Password</label>
    <input type="password" name="password" placeholder="Enter your review password" required>
    <button type="submit">Sign In</button>
  </form>
  <div class="hint">Received a review link? Use the password provided by the VMO2 team.</div>
</div></body></html>`;
}

// ─── Request Handler ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // ═══════ PUBLIC ROUTES ═══════

    // Login page
    if (pathname === '/login' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(loginPage());
    }

    // Login handler
    if (pathname === '/login' && req.method === 'POST') {
      const body = await new Promise(resolve => {
        let data = '';
        req.on('data', c => data += c);
        req.on('end', () => resolve(data));
      });
      const params = new URLSearchParams(body);
      const name = params.get('name');
      const password = params.get('password');

      let role = null;
      if (password === REVIEWER_PASSWORD) role = 'reviewer';
      else if (password === CLIENT_PASSWORD) role = 'client';

      if (!role) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(loginPage('Invalid password. Please try again.'));
      }

      const token = generateToken();
      sessions.set(token, { role, name, created: Date.now() });
      console.log(`[Auth] ${name} logged in as ${role}`);

      const redirect = role === 'reviewer' ? '/' : '/client';
      res.writeHead(302, {
        'Set-Cookie': `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
        Location: redirect,
      });
      return res.end();
    }

    // Logout
    if (pathname === '/logout') {
      const cookies = parseCookies(req);
      if (cookies.session) sessions.delete(cookies.session);
      res.writeHead(302, {
        'Set-Cookie': 'session=; Path=/; HttpOnly; Max-Age=0',
        Location: '/login',
      });
      return res.end();
    }

    // ═══════ AUTH CHECK ═══════

    const session = authenticate(req);
    if (!session && !pathname.startsWith('/api/')) {
      res.writeHead(302, { Location: '/login' });
      return res.end();
    }

    // ═══════ API ENDPOINTS ═══════

    // POST /api/feedback — Submit feedback from dashboard (clients)
    if (pathname === '/api/feedback' && req.method === 'POST') {
      const feedback = await readBody(req);
      if (!feedback.dashboard) return sendJSON(res, { error: 'Missing dashboard ID' }, 400);

      const filename = `${feedback.dashboard}_v${feedback.version}_${new Date().toISOString().split('T')[0]}_${(feedback.reviewer || session?.name || 'anonymous').replace(/\s+/g, '_')}.json`;
      const filepath = path.join(DIRS.feedback, filename);
      fs.writeFileSync(filepath, JSON.stringify(feedback, null, 2));

      const commentCount = (feedback.overall?.length || 0) + (feedback.visuals?.length || 0);
      console.log(`[Feedback] Saved: ${filename} (${commentCount} comments)`);

      setStatus(feedback.dashboard, 'awaiting_review', {
        message: 'Feedback received — awaiting internal review',
        feedbackFile: filename,
        commentCount,
      });

      // Notify reviewer
      notify(
        `New feedback on ${feedback.dashboard} from ${feedback.reviewer || session?.name || 'anonymous'}: ${commentCount} comments`,
        `New Feedback: ${feedback.dashboard} (${commentCount} comments)`,
        `<h3>New Feedback Submitted</h3>
         <p><strong>Dashboard:</strong> ${feedback.dashboard} v${feedback.version}</p>
         <p><strong>Reviewer:</strong> ${feedback.reviewer || session?.name || 'anonymous'}</p>
         <p><strong>Comments:</strong> ${commentCount}</p>
         <p><a href="${BASE_URL}/review" style="background:#1a2d4f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;display:inline-block;margin-top:8px">Open Review Console</a></p>`
      );

      return sendJSON(res, {
        success: true,
        message: 'Feedback submitted — the team will review your comments before applying changes. You will be notified of any questions.',
        file: filename,
        commentCount,
      });
    }

    // GET /api/status/:id
    if (pathname.startsWith('/api/status/')) {
      const id = pathname.split('/').pop();
      const statusFile = path.join(DIRS.status, `${id}_latest.json`);
      if (fs.existsSync(statusFile)) {
        return sendJSON(res, JSON.parse(fs.readFileSync(statusFile, 'utf8')));
      }
      return sendJSON(res, { dashboard: id, status: 'idle' });
    }

    // GET /api/questions/:id — Get pending questions (for client or reviewer)
    if (pathname.startsWith('/api/questions/')) {
      const id = pathname.split('/').pop();
      const questionsFile = path.join(DIRS.questions, `${id}_pending.json`);
      if (fs.existsSync(questionsFile)) {
        return sendJSON(res, JSON.parse(fs.readFileSync(questionsFile, 'utf8')));
      }
      return sendJSON(res, { dashboard: id, questions: [] });
    }

    // POST /api/answers — Submit answers to clarifying questions
    if (pathname === '/api/answers' && req.method === 'POST') {
      const answers = await readBody(req);
      const dashboardId = answers.dashboard;
      if (!dashboardId) return sendJSON(res, { error: 'Missing dashboard ID' }, 400);

      const answersFile = path.join(DIRS.questions, `${dashboardId}_answered.json`);
      fs.writeFileSync(answersFile, JSON.stringify(answers, null, 2));

      const pendingFile = path.join(DIRS.questions, `${dashboardId}_pending.json`);
      if (fs.existsSync(pendingFile)) fs.unlinkSync(pendingFile);

      // Notify reviewer that answers came in
      notify(
        `${dashboardId}: Clarifying questions answered by ${session?.name || 'client'}`,
        `Questions Answered: ${dashboardId}`,
        `<h3>${dashboardId} — Questions Answered</h3><p>The client has answered Claude's clarifying questions.</p><p><a href="${BASE_URL}/review">Review Console</a></p>`
      );

      // If answered by reviewer, re-trigger Claude
      if (session?.role === 'reviewer') {
        const feedbackFiles = fs.readdirSync(DIRS.feedback)
          .filter(f => f.startsWith(dashboardId)).sort().reverse();
        if (feedbackFiles.length > 0) {
          triggerClaude(dashboardId, path.join(DIRS.feedback, feedbackFiles[0]));
        }
      }

      return sendJSON(res, { success: true, message: 'Answers saved. The team will review and continue processing.' });
    }

    // GET /api/dashboards
    if (pathname === '/api/dashboards') {
      const files = fs.readdirSync(DIRS.prototype).filter(f => f.endsWith('.html'));
      const dashboards = files.map(f => {
        const id = f.split('_')[0];
        const statusFile = path.join(DIRS.status, `${id}_latest.json`);
        let status = { status: 'idle' };
        if (fs.existsSync(statusFile)) {
          try { status = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch (e) {}
        }
        return { id, file: f, status: status.status, lastUpdate: status.timestamp };
      });
      return sendJSON(res, dashboards);
    }

    // GET /api/feedback-files — List feedback files (reviewer only)
    if (pathname === '/api/feedback-files') {
      const files = fs.readdirSync(DIRS.feedback)
        .filter(f => f.endsWith('.json') && !f.includes('_review'))
        .sort().reverse();
      const list = files.map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(DIRS.feedback, f), 'utf8'));
          const reviewFile = f.replace('.json', '_review.json');
          const hasReview = fs.existsSync(path.join(DIRS.feedback, reviewFile));
          return {
            file: f, reviewer: data.reviewer || 'anonymous', date: data.date,
            dashboard: data.dashboard, version: data.version,
            commentCount: (data.overall?.length || 0) + (data.visuals?.length || 0),
            reviewed: hasReview,
          };
        } catch (e) { return null; }
      }).filter(Boolean);
      return sendJSON(res, list);
    }

    // GET /api/feedback-file/:filename
    if (pathname.startsWith('/api/feedback-file/')) {
      const filename = decodeURIComponent(pathname.split('/').pop());
      const filepath = path.join(DIRS.feedback, filename);
      if (fs.existsSync(filepath)) return sendJSON(res, JSON.parse(fs.readFileSync(filepath, 'utf8')));
      return sendJSON(res, { error: 'File not found' }, 404);
    }

    // GET /api/feedback-history/:dashboard
    if (pathname.startsWith('/api/feedback-history/')) {
      const dashboardId = pathname.split('/').pop();
      const files = fs.readdirSync(DIRS.feedback).filter(f => f.startsWith(dashboardId)).sort().reverse();
      const history = files.map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(DIRS.feedback, f), 'utf8'));
        return { file: f, reviewer: data.reviewer, date: data.date, version: data.version, commentCount: (data.overall?.length || 0) + (data.visuals?.length || 0) };
      });
      return sendJSON(res, history);
    }

    // GET /api/review-file/:filename
    if (pathname.startsWith('/api/review-file/')) {
      const filename = decodeURIComponent(pathname.split('/').pop());
      const filepath = path.join(DIRS.feedback, filename);
      if (fs.existsSync(filepath)) return sendJSON(res, JSON.parse(fs.readFileSync(filepath, 'utf8')));
      return sendJSON(res, { decisions: {} });
    }

    // POST /api/save-review
    if (pathname === '/api/save-review' && req.method === 'POST') {
      const review = await readBody(req);
      if (!review.file) return sendJSON(res, { error: 'Missing file name' }, 400);
      fs.writeFileSync(path.join(DIRS.feedback, review.file), JSON.stringify(review, null, 2));
      return sendJSON(res, { success: true });
    }

    // POST /api/process-reviewed — Process approved feedback (reviewer only)
    if (pathname === '/api/process-reviewed' && req.method === 'POST') {
      if (session?.role !== 'reviewer') return sendJSON(res, { error: 'Reviewer access required' }, 403);

      const reviewed = await readBody(req);
      const dashboardId = reviewed.dashboard;
      if (!dashboardId) return sendJSON(res, { error: 'Missing dashboard ID' }, 400);

      const approvedCount = (reviewed.overall?.length || 0) + (reviewed.visuals?.length || 0);
      if (approvedCount === 0) return sendJSON(res, { error: 'No approved changes to process' }, 400);

      const filename = `${dashboardId}_reviewed_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(DIRS.feedback, filename);
      fs.writeFileSync(filepath, JSON.stringify(reviewed, null, 2));

      console.log(`[Review] ${approvedCount} approved changes for ${dashboardId}`);
      triggerClaude(dashboardId, filepath);

      return sendJSON(res, { success: true, message: `${approvedCount} approved changes sent to Claude for processing`, file: filename });
    }

    // ═══════ STORY INTAKE API ═══════

    // POST /api/story — Submit a new user story
    if (pathname === '/api/story' && req.method === 'POST') {
      const story = await readBody(req);
      const storyId = `US${Date.now().toString(36).toUpperCase()}`;
      story.id = storyId;
      story.submittedBy = session?.name || 'anonymous';
      story.submittedAt = new Date().toISOString();
      story.status = 'analysing';

      fs.writeFileSync(path.join(DIRS.stories, `${storyId}.json`), JSON.stringify(story, null, 2));

      notify(
        `New user story "${story.title}" submitted by ${story.submittedBy}`,
        `New User Story: ${story.title}`,
        `<h3>New User Story Submitted</h3>
         <p><strong>ID:</strong> ${storyId}</p>
         <p><strong>Title:</strong> ${story.title}</p>
         <p><strong>By:</strong> ${story.submittedBy}</p>
         <p><a href="${BASE_URL}/story/${storyId}">View Story</a></p>`
      );

      triggerStoryAnalysis(storyId);
      return sendJSON(res, { success: true, storyId, message: 'Story submitted. Claude is analysing it and will generate clarifying questions.' });
    }

    // GET /api/story/:id
    if (pathname.match(/^\/api\/story\/[^/]+$/) && req.method === 'GET') {
      const storyId = pathname.split('/').pop();
      const storyFile = path.join(DIRS.stories, `${storyId}.json`);
      if (!fs.existsSync(storyFile)) return sendJSON(res, { error: 'Story not found' }, 404);
      const story = JSON.parse(fs.readFileSync(storyFile, 'utf8'));

      const questionsFile = path.join(DIRS.questions, `story_${storyId}_pending.json`);
      const questions = fs.existsSync(questionsFile) ? JSON.parse(fs.readFileSync(questionsFile, 'utf8')) : null;

      const statusFile = path.join(DIRS.status, `story_${storyId}_latest.json`);
      const status = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf8')) : null;

      return sendJSON(res, { story, questions, status });
    }

    // POST /api/story-answers — Answer story clarifying questions
    if (pathname === '/api/story-answers' && req.method === 'POST') {
      const data = await readBody(req);
      const storyId = data.storyId;
      if (!storyId) return sendJSON(res, { error: 'Missing storyId' }, 400);

      const answersFile = path.join(DIRS.questions, `story_${storyId}_answered.json`);
      fs.writeFileSync(answersFile, JSON.stringify(data, null, 2));

      const pendingFile = path.join(DIRS.questions, `story_${storyId}_pending.json`);
      if (fs.existsSync(pendingFile)) fs.unlinkSync(pendingFile);

      notify(
        `Story ${storyId}: Clarifying questions answered`,
        `Story Questions Answered: ${storyId}`,
        `<p>Answers submitted for story ${storyId}.</p><p><a href="${BASE_URL}/story/${storyId}">View</a></p>`
      );

      return sendJSON(res, { success: true, message: 'Answers saved. The story will be refined and the dashboard creation process will begin.' });
    }

    // GET /api/stories — List all stories
    if (pathname === '/api/stories') {
      if (!fs.existsSync(DIRS.stories)) return sendJSON(res, []);
      const files = fs.readdirSync(DIRS.stories).filter(f => f.endsWith('.json')).sort().reverse();
      const stories = files.map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(DIRS.stories, f), 'utf8'));
          return { id: data.id, title: data.title, submittedBy: data.submittedBy, submittedAt: data.submittedAt, status: data.status };
        } catch (e) { return null; }
      }).filter(Boolean);
      return sendJSON(res, stories);
    }

    // ═══════ PAGE ROUTES ═══════

    // Reviewer hub (index)
    if (pathname === '/' || pathname === '/index.html') {
      if (session?.role !== 'reviewer') { res.writeHead(302, { Location: '/client' }); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(generateReviewerHub(session));
    }

    // Client hub
    if (pathname === '/client') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(generateClientHub(session));
    }

    // Review console (reviewer only)
    if (pathname === '/review') {
      if (session?.role !== 'reviewer') { res.writeHead(302, { Location: '/client' }); return res.end(); }
      const filepath = path.join(PROJECT_ROOT, 'review.html');
      if (fs.existsSync(filepath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(fs.readFileSync(filepath, 'utf8'));
      }
    }

    // Dashboard serving
    if (pathname.startsWith('/dashboard/')) {
      const id = pathname.split('/')[2];
      const filename = getDashboardFilename(id);
      const filepath = path.join(DIRS.prototype, filename);
      if (fs.existsSync(filepath)) {
        let html = fs.readFileSync(filepath, 'utf8');
        // Inject the API connection and question polling for clients
        const injection = generateDashboardInjection(id, session);
        html = html.replace('</body>', injection + '\n</body>');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(html);
      }
      res.writeHead(404);
      return res.end('Dashboard not found');
    }

    // Story page
    if (pathname.startsWith('/story/')) {
      const storyId = pathname.split('/')[2];
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(generateStoryPage(storyId, session));
    }

    // New story page
    if (pathname === '/new-story') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(generateNewStoryPage(session));
    }

    // ═══════ STATIC FILES ═══════
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PROJECT_ROOT, safePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': getMime(filePath) });
      return res.end(fs.readFileSync(filePath));
    }

    res.writeHead(404);
    res.end('Not found');

  } catch (err) {
    console.error('[Error]', err);
    sendJSON(res, { error: err.message }, 500);
  }
});

// ─── Dashboard Injection (question polling + feedback API) ─────────────────────

function generateDashboardInjection(dashboardId, session) {
  return `
<!-- VMO2 Review Server Injection -->
<div id="vmo2-question-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;background:#1a2d4f;color:#fff;padding:16px 24px;z-index:100000;box-shadow:0 -4px 20px rgba(0,0,0,.2);font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:900px;margin:0 auto">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <strong style="font-size:14px">Claude has questions about your feedback</strong>
      <button onclick="document.getElementById('vmo2-question-banner').style.display='none'" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">&times;</button>
    </div>
    <div id="vmo2-questions-list" style="max-height:300px;overflow-y:auto"></div>
    <div style="margin-top:12px;text-align:right">
      <button onclick="submitQuestionAnswers('${dashboardId}')" style="background:#d97706;color:#000;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;font-weight:500;font-size:13px">Submit Answers</button>
    </div>
  </div>
</div>

<div id="vmo2-status-pill" style="position:fixed;bottom:16px;right:16px;background:#1a2d4f;color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;font-family:system-ui;z-index:99999;cursor:pointer;display:none;box-shadow:0 2px 8px rgba(0,0,0,.2)" onclick="this.style.display='none'">
  <span id="vmo2-status-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:#166534"></span>
  <span id="vmo2-status-text">Ready</span>
</div>

<script>
(function(){
  const DID = '${dashboardId}';
  const statusPill = document.getElementById('vmo2-status-pill');
  const statusDot = document.getElementById('vmo2-status-dot');
  const statusText = document.getElementById('vmo2-status-text');
  const questionBanner = document.getElementById('vmo2-question-banner');
  const questionsList = document.getElementById('vmo2-questions-list');

  statusPill.style.display = 'block';

  function pollStatus() {
    fetch('/api/status/' + DID)
      .then(r => r.json())
      .then(s => {
        const colors = { idle: '#166534', processing: '#d97706', questions_pending: '#C8102E', awaiting_review: '#d97706', complete: '#166534', error: '#991b1b' };
        const labels = { idle: 'Ready for review', processing: 'Applying changes...', questions_pending: 'Questions from Claude', awaiting_review: 'Feedback submitted — under review', complete: 'Updated!', error: 'Error' };
        statusDot.style.background = colors[s.status] || '#757575';
        statusText.textContent = labels[s.status] || s.status;
        if (s.status === 'complete') {
          statusText.textContent = 'Updated! Click to reload';
          statusPill.onclick = () => location.reload();
        }
        if (s.status === 'questions_pending') loadQuestions();
      })
      .catch(() => {});
  }

  function loadQuestions() {
    fetch('/api/questions/' + DID)
      .then(r => r.json())
      .then(data => {
        if (!data.questions || data.questions.length === 0) return;
        questionBanner.style.display = 'block';
        questionsList.innerHTML = data.questions.map((q, i) =>
          '<div style="background:rgba(255,255,255,.1);border-radius:6px;padding:10px;margin-bottom:6px">' +
          '<div style="font-size:12px;font-weight:500;margin-bottom:4px">' + (q.about ? '<span style="color:#d97706">[' + q.about + ']</span> ' : '') + q.question + '</div>' +
          (q.context ? '<div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:6px">Re: ' + q.context + '</div>' : '') +
          '<textarea id="vmo2-ans-' + i + '" style="width:100%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:4px;color:#fff;padding:6px 8px;font-size:12px;min-height:40px;resize:vertical;font-family:inherit" placeholder="Your answer..."></textarea>' +
          '</div>'
        ).join('');
      });
  }

  window.submitQuestionAnswers = function(did) {
    const textareas = questionsList.querySelectorAll('textarea');
    const answers = [];
    textareas.forEach((ta, i) => { answers.push({ questionIndex: i, answer: ta.value }); });
    fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboard: did, answers, answeredBy: '${session?.name || "client"}' })
    })
    .then(r => r.json())
    .then(data => {
      questionBanner.style.display = 'none';
      statusText.textContent = 'Answers submitted';
      statusDot.style.background = '#166534';
    });
  };

  pollStatus();
  setInterval(pollStatus, 10000);
})();
</script>`;
}

// ─── Page Generators ───────────────────────────────────────────────────────────

function pageShell(title, session, body) {
  const isReviewer = session?.role === 'reviewer';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — VMO2 Dashboards</title>
<style>
:root{--navy:#1a2d4f;--red:#C8102E;--amber:#d97706;--green:#166534;--bg:#f1f3f4;--card:#fff;--border:#e0e0e0;--text:#212121;--muted:#757575}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);min-height:100vh}
.header{background:var(--navy);padding:16px 28px;color:#fff;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:18px;font-weight:500}
.header-sub{font-size:12px;color:rgba(255,255,255,.5);margin-top:2px}
.header-right{display:flex;align-items:center;gap:12px}
.header-right a,.header-right button{font-size:12px;color:rgba(255,255,255,.7);text-decoration:none;background:none;border:none;cursor:pointer;font-family:inherit}
.header-right a:hover,.header-right button:hover{color:#fff}
.nav{background:#fff;border-bottom:1px solid var(--border);padding:0 28px;display:flex;gap:0}
.nav a{font-size:13px;color:var(--muted);text-decoration:none;padding:12px 16px;border-bottom:2px solid transparent;transition:all .15s}
.nav a:hover{color:var(--navy)}
.nav a.active{color:var(--navy);border-bottom-color:var(--navy);font-weight:500}
.content{max-width:1000px;margin:28px auto;padding:0 24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:28px}
.card{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:20px;transition:box-shadow .2s}
.card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
.card h3{font-size:15px;color:var(--navy);margin-bottom:4px}
.card p{font-size:12px;color:var(--muted);line-height:1.5}
.card .status{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--muted)}
.card .dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.btn{display:inline-block;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;cursor:pointer;border:none;font-family:inherit}
.btn-primary{background:var(--navy);color:#fff}
.btn-primary:hover{background:#243a5e}
.btn-amber{background:var(--amber);color:#000}
.section-title{font-size:13px;font-weight:600;color:var(--navy);margin-bottom:12px}
</style></head><body>
<div class="header">
  <div>
    <h1>VMO2 Dashboards</h1>
    <div class="header-sub">${isReviewer ? 'Reviewer Console' : 'Client Review Portal'}</div>
  </div>
  <div class="header-right">
    <span style="font-size:11px">${session?.name || 'Guest'} (${session?.role || ''})</span>
    ${isReviewer ? '<a href="/review">Review Console</a>' : ''}
    <a href="/new-story">New Story</a>
    <button onclick="location='/logout'">Sign Out</button>
  </div>
</div>
<nav class="nav">
  <a href="${isReviewer ? '/' : '/client'}" class="active">Dashboards</a>
  <a href="/new-story">New Story</a>
</nav>
<div class="content">${body}</div>
</body></html>`;
}

function generateReviewerHub(session) {
  const dashboardFiles = fs.readdirSync(DIRS.prototype).filter(f => f.endsWith('.html'));
  const cards = dashboardFiles.map(f => {
    const id = f.split('_')[0];
    const name = f.replace('.html', '').replace(/_/g, ' ');
    const statusFile = path.join(DIRS.status, `${id}_latest.json`);
    let status = 'idle', statusColor = '#166534';
    if (fs.existsSync(statusFile)) {
      try {
        const s = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        status = s.status || 'idle';
        statusColor = { processing: '#d97706', questions_pending: '#C8102E', awaiting_review: '#d97706', error: '#991b1b' }[status] || '#166534';
      } catch (e) {}
    }
    return `<a href="/dashboard/${id}" style="text-decoration:none;color:inherit"><div class="card">
      <h3>${id}</h3><p>${name}</p>
      <div class="status"><span class="dot" style="background:${statusColor}"></span>${status}</div>
    </div></a>`;
  }).join('');

  // Pending feedback count
  const feedbackFiles = fs.readdirSync(DIRS.feedback).filter(f => f.endsWith('.json') && !f.includes('_review'));
  const pendingCount = feedbackFiles.length;

  return pageShell('Reviewer Hub', session, `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="section-title" style="margin:0">Dashboards</div>
      ${pendingCount > 0 ? `<a href="/review" class="btn btn-amber">${pendingCount} feedback pending review</a>` : ''}
    </div>
    <div class="grid">${cards}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div class="section-title" style="margin:0">Tools</div>
    </div>
    <div class="grid">
      <a href="/review" style="text-decoration:none;color:inherit"><div class="card" style="border-color:var(--amber)">
        <h3 style="color:#92400e">Review Console</h3>
        <p>Approve, reject, or clarify client feedback before Claude applies changes</p>
      </div></a>
      <a href="/new-story" style="text-decoration:none;color:inherit"><div class="card" style="border-color:var(--green)">
        <h3 style="color:var(--green)">New User Story</h3>
        <p>Submit a new dashboard requirement — Claude will ask clarifying questions</p>
      </div></a>
    </div>
  `);
}

function generateClientHub(session) {
  const dashboardFiles = fs.readdirSync(DIRS.prototype).filter(f => f.endsWith('.html'));
  const cards = dashboardFiles.map(f => {
    const id = f.split('_')[0];
    const name = f.replace('.html', '').replace(/_/g, ' ');
    const statusFile = path.join(DIRS.status, `${id}_latest.json`);
    let status = 'idle', statusColor = '#166534';
    if (fs.existsSync(statusFile)) {
      try {
        const s = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        status = s.status || 'idle';
        statusColor = { processing: '#d97706', questions_pending: '#C8102E', awaiting_review: '#d97706', error: '#991b1b' }[status] || '#166534';
      } catch (e) {}
    }
    const statusLabel = { idle: 'Ready for review', processing: 'Changes being applied', questions_pending: 'Questions for you', awaiting_review: 'Under review', complete: 'Updated', error: 'Error' }[status] || status;
    return `<a href="/dashboard/${id}" style="text-decoration:none;color:inherit"><div class="card">
      <h3>${id}</h3><p>${name}</p>
      <div class="status"><span class="dot" style="background:${statusColor}"></span>${statusLabel}</div>
    </div></a>`;
  }).join('');

  return pageShell('Review Portal', session, `
    <div class="section-title">Dashboards for Review</div>
    <div class="grid">${cards}</div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:20px;font-size:13px;line-height:1.7;color:#333">
      <h3 style="font-size:14px;color:var(--navy);margin-bottom:8px">How to Review</h3>
      <ol style="padding-left:20px">
        <li>Click a dashboard above to open it</li>
        <li>Click the <strong>Feedback</strong> button (top-right corner)</li>
        <li>Click the speech bubble on any chart or KPI to add a comment</li>
        <li>Use the overall feedback panel for dashboard-wide comments</li>
        <li>Click <strong>Submit Feedback</strong> when done</li>
        <li>Your comments will be reviewed by the team, then changes will be applied</li>
        <li>If Claude has questions, they'll appear at the bottom of the dashboard</li>
      </ol>
    </div>
  `);
}

// ─── Story Pages ───────────────────────────────────────────────────────────────

function generateNewStoryPage(session) {
  return pageShell('New User Story', session, `
    <div class="section-title">Submit a New User Story</div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:20px">
      Describe what you need the dashboard to show. Claude will analyse your requirements and ask clarifying questions to ensure the dashboard meets your needs.
    </p>
    <form id="storyForm" style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:24px">
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">Story Title</label>
        <input type="text" id="storyTitle" placeholder="e.g. Equipment Lifecycle Cost Analysis" required
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">As a... (user role)</label>
        <input type="text" id="storyRole" placeholder="e.g. Network Planning Manager" required
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">I want to... (what you need to see/do)</label>
        <textarea id="storyWant" rows="3" placeholder="e.g. View equipment costs by region and supplier, identify cost anomalies, and track lifecycle replacement schedules" required
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">So that... (decision/outcome this enables)</label>
        <textarea id="storySoThat" rows="2" placeholder="e.g. I can make informed procurement decisions and plan replacement budgets" required
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">Key metrics / KPIs (if known)</label>
        <textarea id="storyKPIs" rows="2" placeholder="e.g. Total cost per site, cost per equipment type, replacement cycle time, supplier cost comparison"
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">Data sources (if known)</label>
        <textarea id="storyData" rows="2" placeholder="e.g. Dynamo equipment data, rental costs CSV, supplier contracts"
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:12px;font-weight:500;color:var(--navy);display:block;margin-bottom:4px">Additional context</label>
        <textarea id="storyContext" rows="3" placeholder="Any extra detail: audience, frequency of use, existing reports this replaces, priority..."
          style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
      </div>
      <button type="submit" class="btn btn-primary">Submit Story for Analysis</button>
    </form>
    <div id="storyResult" style="display:none;margin-top:20px;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:20px"></div>

    <script>
    document.getElementById('storyForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      fetch('/api/story', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: document.getElementById('storyTitle').value,
          role: document.getElementById('storyRole').value,
          want: document.getElementById('storyWant').value,
          soThat: document.getElementById('storySoThat').value,
          kpis: document.getElementById('storyKPIs').value,
          dataSources: document.getElementById('storyData').value,
          context: document.getElementById('storyContext').value
        })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          document.getElementById('storyResult').style.display = 'block';
          document.getElementById('storyResult').innerHTML =
            '<div style="color:var(--green);font-weight:500;margin-bottom:8px">Story submitted successfully!</div>' +
            '<p style="font-size:13px;color:var(--text)">Story ID: <strong>' + data.storyId + '</strong></p>' +
            '<p style="font-size:12px;color:var(--muted);margin-top:4px">' + data.message + '</p>' +
            '<a href="/story/' + data.storyId + '" class="btn btn-primary" style="margin-top:12px;display:inline-block;color:#fff">View Story & Questions</a>';
        }
        btn.disabled = false;
        btn.textContent = 'Submit Story for Analysis';
      });
    });
    </script>
  `);
}

function generateStoryPage(storyId, session) {
  return pageShell('Story ' + storyId, session, `
    <div id="storyContent"><p style="color:var(--muted)">Loading story...</p></div>
    <script>
    const storyId = '${storyId}';

    function loadStory() {
      fetch('/api/story/' + storyId)
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            document.getElementById('storyContent').innerHTML = '<p style="color:var(--red)">Story not found.</p>';
            return;
          }
          renderStory(data);
        });
    }

    function renderStory(data) {
      const s = data.story;
      const q = data.questions;
      const st = data.status;

      let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">';
      html += '<div><div class="section-title" style="margin:0">' + s.title + '</div>';
      html += '<div style="font-size:12px;color:var(--muted);margin-top:2px">Submitted by ' + s.submittedBy + ' on ' + (s.submittedAt || '').split('T')[0] + '</div></div>';
      if (st) {
        const colors = { analysing: '#d97706', questions_pending: '#C8102E', refined: '#166534', building: '#d97706', complete: '#166534' };
        html += '<span style="font-size:11px;padding:4px 12px;border-radius:12px;background:' + (colors[st.status] || '#757575') + '20;color:' + (colors[st.status] || '#757575') + ';font-weight:500">' + (st.status || 'pending') + '</span>';
      }
      html += '</div>';

      // Story details
      html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:20px;margin-bottom:20px">';
      html += '<div style="font-size:13px;line-height:1.7;color:var(--text)">';
      html += '<strong>As a</strong> ' + s.role + ',<br>';
      html += '<strong>I want to</strong> ' + s.want + ',<br>';
      html += '<strong>So that</strong> ' + s.soThat;
      if (s.kpis) html += '<div style="margin-top:12px"><strong>KPIs:</strong> ' + s.kpis + '</div>';
      if (s.dataSources) html += '<div style="margin-top:4px"><strong>Data:</strong> ' + s.dataSources + '</div>';
      if (s.context) html += '<div style="margin-top:4px"><strong>Context:</strong> ' + s.context + '</div>';
      html += '</div></div>';

      // Questions
      if (q && q.questions && q.questions.length > 0) {
        html += '<div class="section-title">Clarifying Questions from Claude</div>';
        html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:20px;margin-bottom:20px">';
        html += '<p style="font-size:12px;color:var(--muted);margin-bottom:12px">Please answer these questions so we can build the right dashboard for you.</p>';
        q.questions.forEach((qItem, i) => {
          html += '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:8px">';
          html += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">';
          if (qItem.category) html += '<span style="font-size:10px;padding:2px 8px;background:#e0f2fe;color:#0369a1;border-radius:3px">' + qItem.category + '</span>';
          html += '<span style="font-size:13px;font-weight:500;color:var(--navy)">' + qItem.question + '</span>';
          html += '</div>';
          if (qItem.why) html += '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">Why: ' + qItem.why + '</div>';
          if (qItem.suggestion) html += '<div style="font-size:11px;color:var(--amber);margin-bottom:6px">Suggested default: ' + qItem.suggestion + '</div>';
          html += '<textarea id="story-ans-' + i + '" rows="2" style="width:100%;border:1px solid var(--border);border-radius:4px;padding:8px;font-size:12px;font-family:inherit;resize:vertical" placeholder="Your answer...">' + (qItem.answer || '') + '</textarea>';
          html += '</div>';
        });
        html += '<button onclick="submitStoryAnswers()" class="btn btn-primary" style="margin-top:12px">Submit Answers</button>';
        html += '</div>';
      }

      // Status summary
      if (st && st.summary) {
        html += '<div class="section-title">Analysis Summary</div>';
        html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:20px;font-size:13px;color:var(--text);line-height:1.6">' + st.summary + '</div>';
      }

      document.getElementById('storyContent').innerHTML = html;
    }

    window.submitStoryAnswers = function() {
      const textareas = document.querySelectorAll('[id^="story-ans-"]');
      const answers = [];
      textareas.forEach((ta, i) => answers.push({ questionIndex: i, answer: ta.value }));

      fetch('/api/story-answers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ storyId, answers })
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          alert('Answers submitted. The team will review and begin building your dashboard.');
          loadStory();
        }
      });
    };

    loadStory();
    setInterval(loadStory, 15000);
    </script>
  `);
}

// ─── Start ─────────────────────────────────────────────────────────────────────

initEmail();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              VMO2 Dashboard Review Server                     ║
║                                                               ║
║  Local:       http://localhost:${PORT}                            ║
║  Network:     http://0.0.0.0:${PORT}                              ║
║                                                               ║
║  Client view:   /client          (password: CLIENT_PASSWORD)  ║
║  Reviewer hub:  /                (password: REVIEWER_PASSWORD) ║
║  Review console:/review          (reviewer only)              ║
║  New story:     /new-story                                    ║
║                                                               ║
║  Dashboards:                                                  ║
║  /dashboard/US1  /dashboard/US2  /dashboard/US3               ║
║                                                               ║
║  Deploy to Railway/Render for public URL, or use:             ║
║  npx cloudflared tunnel --url http://localhost:${PORT}            ║
║═══════════════════════════════════════════════════════════════╝
`);
});
