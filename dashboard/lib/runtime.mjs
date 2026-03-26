import { spawn } from "node:child_process";

export function createRuntimeHelpers(repoRoot) {
  function runScript(script, args = [], options = {}) {
    return new Promise((resolve) => {
      const child = spawn(script, args, {
        cwd: repoRoot,
        env: { ...process.env },
        shell: false
      });

      let stdout = "";
      let stderr = "";
      const timeoutMs = Number(options.timeoutMs || 0);
      let timer = null;

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          child.kill("SIGTERM");
          setTimeout(() => child.kill("SIGKILL"), 2000).unref?.();
        }, timeoutMs);
        timer.unref?.();
      }

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        if (timer) clearTimeout(timer);
        resolve({
          code: 1,
          signal: null,
          stdout,
          stderr: error instanceof Error ? error.message : String(error)
        });
      });
      child.on("close", (code, signal) => {
        if (timer) clearTimeout(timer);
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

  return { runScript, launchDetached, readJson };
}
