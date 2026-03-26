import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "openclaw.config.json");
const launchScript = path.join(repoRoot, "scripts", "oc-launch");
const statusScript = path.join(repoRoot, "scripts", "oc-status");
const doctorScript = path.join(repoRoot, "scripts", "oc-doctor");
const skillsScript = path.join(repoRoot, "scripts", "oc-skills");
const agentScript = path.join(repoRoot, "scripts", "oc-agent");

const port = Number(process.env.PORT || 3030);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readConfig() {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function writeConfig(config) {
  const body = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(configPath, body, "utf8");
}

function runScript(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(script, args, {
      cwd: repoRoot,
      env: { ...process.env },
      shell: false
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code, signal) => {
      resolve({
        code,
        signal,
        stdout,
        stderr
      });
    });
  });
}

function launchDetached(script, args = []) {
  const child = spawn(script, args, {
    cwd: repoRoot,
    env: { ...process.env },
    detached: true,
    stdio: "ignore",
    shell: false
  });
  child.unref();
  return child.pid;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString("utf8");
      if (data.length > 2_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function configValue(config, pathParts) {
  let current = config;
  for (const part of pathParts) {
    if (!current || typeof current !== "object") return "";
    current = current[part];
  }
  return current ?? "";
}

function setNestedValue(target, pathParts, value) {
  let current = target;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const key = pathParts[i];
    if (!current[key] || typeof current[key] !== "object" || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  current[pathParts[pathParts.length - 1]] = value;
}

function renderPage(state, lastResult) {
  const config = state.config;
  const workspace = configValue(config, ["agents", "defaults", "workspace"]);
  const gatewayMode = configValue(config, ["gateway", "mode"]);
  const gatewayBind = configValue(config, ["gateway", "bind"]);
  const statusText = lastResult?.stdout || "";
  const statusError = lastResult?.stderr || "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>agent.meimei dashboard</title>
  <style>
    :root {
      --bg: #08111f;
      --panel: rgba(12, 19, 34, 0.9);
      --panel-2: rgba(18, 27, 46, 0.9);
      --line: rgba(255, 255, 255, 0.08);
      --text: #f3f6ff;
      --muted: rgba(243, 246, 255, 0.72);
      --accent: #8fd3ff;
      --accent-2: #86f0c2;
      --warn: #ffce7a;
      --danger: #ff8d8d;
      --shadow: 0 20px 80px rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(143, 211, 255, 0.22), transparent 34%),
        radial-gradient(circle at top right, rgba(134, 240, 194, 0.14), transparent 30%),
        linear-gradient(180deg, #05101d 0%, #08111f 55%, #050b14 100%);
      min-height: 100vh;
    }
    .shell {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 20px;
      align-items: stretch;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }
    .hero-main {
      padding: 28px;
      position: relative;
      overflow: hidden;
    }
    .hero-main::after {
      content: "";
      position: absolute;
      inset: auto -20% -40% auto;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(143, 211, 255, 0.2), transparent 68%);
      pointer-events: none;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 14px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: clamp(2rem, 4vw, 4rem);
      line-height: 0.96;
      max-width: 10ch;
    }
    .lede {
      max-width: 64ch;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
    }
    .stat-grid {
      display: grid;
      gap: 14px;
      padding: 20px;
    }
    .stat {
      background: var(--panel-2);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
    }
    .stat .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .stat .value {
      font-size: 18px;
      font-weight: 650;
      word-break: break-word;
    }
    .grid {
      margin-top: 20px;
      display: grid;
      gap: 20px;
      grid-template-columns: 1fr 1fr;
    }
    .section {
      padding: 22px;
    }
    .section h2 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    .section p.sub {
      margin: 0 0 18px;
      font-size: 13px;
      color: var(--muted);
    }
    .form {
      display: grid;
      gap: 14px;
    }
    .field {
      display: grid;
      gap: 8px;
    }
    .field label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    input, select, textarea, button {
      font: inherit;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(4, 10, 20, 0.72);
      color: var(--text);
      padding: 12px 14px;
      outline: none;
    }
    textarea {
      min-height: 120px;
      resize: vertical;
    }
    .row {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr 1fr;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }
    button, .button {
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(143, 211, 255, 0.18), rgba(143, 211, 255, 0.08));
      color: var(--text);
      border-radius: 14px;
      padding: 11px 14px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .button.secondary, button.secondary {
      background: rgba(255, 255, 255, 0.03);
    }
    .button.warn, button.warn {
      background: rgba(255, 206, 122, 0.12);
    }
    .button.good, button.good {
      background: rgba(134, 240, 194, 0.12);
    }
    pre {
      margin: 0;
      padding: 16px;
      overflow: auto;
      border-radius: 18px;
      background: rgba(3, 8, 15, 0.8);
      border: 1px solid var(--line);
      color: #d8e6ff;
      font-size: 12px;
      line-height: 1.6;
      max-height: 420px;
    }
    .split {
      display: grid;
      gap: 14px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    .footer {
      margin-top: 20px;
      color: var(--muted);
      font-size: 12px;
    }
    @media (max-width: 900px) {
      .hero, .grid, .row { grid-template-columns: 1fr; }
      .shell { padding: 18px 14px 34px; }
      .hero-main { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="hero">
      <section class="card hero-main">
        <div class="eyebrow">agent.meimei control room</div>
        <h1>OpenClaw settings and launch dashboard.</h1>
        <p class="lede">
          Edit the repo-local OpenClaw config, validate the workspace, inspect the runtime
          status, and start the gateway from one localhost panel. This is the operator
          surface for the feature we just delivered.
        </p>
        <div class="actions" style="margin-top:18px">
          <button class="button good" type="button" data-run="status">Run status</button>
          <button class="button secondary" type="button" data-run="skills">Check skills</button>
          <button class="button warn" type="button" data-run="doctor">Run doctor</button>
        </div>
      </section>
      <aside class="card stat-grid">
        <div class="stat">
          <div class="label">Config path</div>
          <div class="value">${escapeHtml(state.configPath)}</div>
        </div>
        <div class="stat">
          <div class="label">Workspace</div>
          <div class="value">${escapeHtml(workspace || "(unset)")}</div>
        </div>
        <div class="stat">
          <div class="label">Gateway</div>
          <div class="value">${escapeHtml(gatewayMode || "(unset)")} / ${escapeHtml(gatewayBind || "(unset)")}</div>
        </div>
      </aside>
    </div>

    <div class="grid">
      <section class="card section">
        <h2>Settings</h2>
        <p class="sub">Update the values that control how OpenClaw uses this workspace.</p>
        <form class="form" method="post" action="/api/config" data-config-form>
          <div class="field">
            <label for="workspace">Workspace</label>
            <input id="workspace" name="workspace" value="${escapeHtml(workspace || "")}" placeholder="/Users/you/Projects/agent.meimei" />
          </div>
          <div class="row">
            <div class="field">
              <label for="gatewayMode">Gateway mode</label>
              <select id="gatewayMode" name="gatewayMode">
                ${["local", "remote"].map((mode) => `<option value="${mode}" ${mode === gatewayMode ? "selected" : ""}>${mode}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="gatewayBind">Gateway bind</label>
              <select id="gatewayBind" name="gatewayBind">
                ${["loopback", "lan", "tailnet", "auto", "custom"].map((mode) => `<option value="${mode}" ${mode === gatewayBind ? "selected" : ""}>${mode}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="actions">
            <button type="submit" class="good">Save settings</button>
            <a class="button secondary" href="/api/config">View raw config</a>
          </div>
        </form>
      </section>

      <section class="card section">
        <h2>Operations</h2>
        <p class="sub">Use the built-in CLI wrappers without leaving the browser.</p>
        <div class="actions">
          <form method="post" action="/api/run" style="display:inline" data-run-form>
            <input type="hidden" name="cmd" value="status" />
            <button type="submit">Status</button>
          </form>
          <form method="post" action="/api/run" style="display:inline" data-run-form>
            <input type="hidden" name="cmd" value="skills" />
            <button type="submit">Skills</button>
          </form>
          <form method="post" action="/api/run" style="display:inline" data-run-form>
            <input type="hidden" name="cmd" value="doctor" />
            <button type="submit" class="warn">Doctor</button>
          </form>
          <form method="post" action="/api/run" style="display:inline" data-run-form>
            <input type="hidden" name="cmd" value="launch" />
            <button type="submit" class="good">Launch</button>
          </form>
        </div>
        <div class="footer">OpenClaw gateway is already present locally if you want to use it immediately.</div>
      </section>

      <section class="card section">
        <h2>Latest output</h2>
        <p class="sub">Last operation result returned by the dashboard server.</p>
        <pre>${escapeHtml(statusText || statusError || "No command has been run yet.")}</pre>
      </section>

      <section class="card section">
        <h2>Quick agent turn</h2>
        <p class="sub">Send a message through the repo-local wrapper.</p>
        <form class="form" method="post" action="/api/run" data-agent-form>
          <input type="hidden" name="cmd" value="agent" />
          <div class="field">
            <label for="message">Message</label>
            <textarea id="message" name="message" placeholder="Summarize the current workspace status."></textarea>
          </div>
          <div class="actions">
            <button type="submit" class="good">Send to agent</button>
          </div>
        </form>
      </section>
    </div>
  </div>
  <script>
    const output = document.querySelector('pre');
    async function postForm(form) {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
      });
      const data = await response.json();
      output.textContent = JSON.stringify(data, null, 2);
      return data;
    }
    document.querySelectorAll('[data-run-form], [data-config-form], [data-agent-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = await postForm(form);
        if (form.matches('[data-config-form]') && data.ok) {
          window.location.reload();
        }
      });
    });
    document.querySelectorAll('button[data-run]').forEach((button) => {
      button.addEventListener('click', async () => {
        const data = await fetch('/api/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ cmd: button.dataset.run })
        }).then((response) => response.json());
        output.textContent = JSON.stringify(data, null, 2);
      });
    });
  </script>
</body>
</html>`;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (req.method === "GET" && url.pathname === "/") {
      const config = await readConfig();
      const html = renderPage({
        config,
        configPath
      });
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      const config = await readConfig();
      sendJson(res, 200, { configPath, config });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/run") {
      const cmd = url.searchParams.get("cmd") || "status";
      const result = await executeCommand(cmd, {});
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/config") {
      const body = await readJson(req);
      const config = await readConfig();
      const nextWorkspace = String(body.workspace || "").trim();
      if (nextWorkspace) {
        setNestedValue(config, ["agents", "defaults", "workspace"], nextWorkspace);
      }
      const nextGatewayMode = String(body.gatewayMode || "").trim();
      if (nextGatewayMode) {
        setNestedValue(config, ["gateway", "mode"], nextGatewayMode);
      }
      const nextGatewayBind = String(body.gatewayBind || "").trim();
      if (nextGatewayBind) {
        setNestedValue(config, ["gateway", "bind"], nextGatewayBind);
      }
      await writeConfig(config);
      const result = await runScript("bash", [statusScript]);
      sendJson(res, 200, {
        ok: true,
        message: "Settings saved.",
        config,
        lastResult: result
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/run") {
      const body = await readJson(req);
      const cmd = String(body.cmd || "status");
      const result = await executeCommand(cmd, body);
      sendJson(res, 200, result);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

async function executeCommand(cmd, body) {
  switch (cmd) {
    case "status":
      return await runScript("bash", [statusScript]);
    case "doctor":
      return await runScript("bash", [doctorScript, "--non-interactive"]);
    case "skills":
      return await runScript("bash", [skillsScript]);
    case "launch":
      return {
        ok: true,
        pid: launchDetached("bash", [launchScript]),
        stdout: "Launch requested.",
        stderr: "",
        code: 0,
        signal: null
      };
    case "agent": {
      const message = String(body.message || "").trim();
      return await runScript("bash", [agentScript, "--message", message || "Hello from the agent dashboard."]);
    }
    default:
      return {
        code: 1,
        signal: null,
        stdout: "",
        stderr: `Unknown command: ${cmd}`
      };
  }
}

server.listen(port, "127.0.0.1", () => {
  console.log(`agent.meimei dashboard listening on http://127.0.0.1:${port}`);
});
