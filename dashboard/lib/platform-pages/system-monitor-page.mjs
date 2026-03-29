/**
 * Platform UI — System monitor (queue explorer) GET HTML.
 * @version 1.0.0
 * @aligned package agent-meimei 0.8.15
 */

/**
 * @param {unknown} layoutDoc
 * @param {object} d toolsRoute, monitor feed API path, layout + escape helpers
 */
export function renderSystemMonitorPage(layoutDoc, d) {
  const backHref = d.toolsRoute;
  const topbar = `<div class="topbar">
      <a class="button secondary" href="${d.escapeHtml(backHref)}">&larr; Back to Tools</a>
      <span class="title">System monitor</span>
    </div>`;
  const main = `<main class="hero">
      <section class="route-card">
        <h1 class="u-mt0">Queue explorer</h1>
        <p class="lede u-mb12">Read-only <strong>Milestone H</strong> view of <code>meimei_jobs</code> — <code>app_task</code> and <code>inference_v1</code> in one stream. Click a row to show the full <code>trace_id</code> lineage (request → inference → reply). Large Claim Check bodies are <strong>not</strong> loaded; only the artifact path is shown.</p>
        <p class="muted u-mb12 ds-text-md">Polls <code>${d.escapeHtml(d.meimeiMonitorFeedApiRoute)}</code> every ~2.5s. No mutations.</p>
        <div class="route-actions u-mb12 ds-toolbar">
          <span id="smFilterLabel" class="muted ds-text-md">Newest jobs (global).</span>
          <button type="button" class="button secondary" id="smClearTrace" hidden>Clear trace filter</button>
        </div>
        <div id="smError" class="result-card u-mb12 ds-result-danger" hidden></div>
        <div id="smFeed" class="sm-feed"></div>
      </section>
    </main>`;
  const layout = d.buildLayoutFlowHtml(
    layoutDoc,
    d.miniappPageKey("system-monitor"),
    { topbar, main },
    d.escapeAttr
  );
  const feedPathJson = JSON.stringify(d.meimeiMonitorFeedApiRoute);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>System monitor - agent.meimei</title>
  <link rel="stylesheet" href="${d.escapeHtml(d.designSystemCssPath)}" />
  <link rel="stylesheet" href="${d.escapeHtml(d.operatorChromeCssPath)}" />
</head>
<body data-theme="tools" data-page="system-monitor">
  <div class="shell">${layout}</div>
  <script>
    (function () {
      var feedPath = ${feedPathJson};
      function apiDashPrefix() {
        var p = window.location.pathname || "";
        return (p === "/dashboard" || p.indexOf("/dashboard/") === 0) ? "/dashboard" : "";
      }
      var traceFilter = null;
      var focusJobId = null;
      var feedEl = document.getElementById("smFeed");
      var errEl = document.getElementById("smError");
      var lblEl = document.getElementById("smFilterLabel");
      var clearBtn = document.getElementById("smClearTrace");

      function setError(msg) {
        if (!errEl) return;
        if (!msg) {
          errEl.hidden = true;
          errEl.textContent = "";
          return;
        }
        errEl.hidden = false;
        errEl.textContent = msg;
      }

      function renderItems(items) {
        if (!feedEl) return;
        feedEl.innerHTML = "";
        if (!items || items.length === 0) {
          feedEl.textContent = "(no rows)";
          return;
        }
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var wrap = document.createElement("div");
          wrap.className = "sm-line-wrap";
          var line = document.createElement("div");
          line.className = "sm-line" + (focusJobId && Number(it.id) === focusJobId ? " sm-line--focus" : "");
          line.textContent = it.display_line || "";
          line.setAttribute("data-trace-id", it.trace_id || "");
          line.setAttribute("data-job-id", String(it.id));
          line.setAttribute("role", "button");
          line.setAttribute("tabindex", "0");
          line.addEventListener("click", function (ev) {
            var el = ev.currentTarget;
            traceFilter = el.getAttribute("data-trace-id") || null;
            focusJobId = Number(el.getAttribute("data-job-id")) || null;
            if (lblEl) {
              lblEl.textContent = traceFilter
                ? ("Trace lineage: " + traceFilter)
                : "Newest jobs (global).";
            }
            if (clearBtn) clearBtn.hidden = !traceFilter;
            loadFeed();
          });
          line.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              line.click();
            }
          });
          wrap.appendChild(line);
          if (it.artifact_path) {
            var art = document.createElement("div");
            art.className = "sm-artifact";
            art.textContent = "\u{1F4CE} Artifact generated: " + it.artifact_path;
            wrap.appendChild(art);
          }
          feedEl.appendChild(wrap);
        }
      }

      async function loadFeed() {
        try {
          setError("");
          var q = new URLSearchParams();
          q.set("limit", traceFilter ? "400" : "120");
          if (traceFilter) q.set("trace_id", traceFilter);
          var url = apiDashPrefix() + feedPath + "?" + q.toString();
          var res = await fetch(url, { cache: "no-store" });
          var data = await res.json().catch(function () { return null; });
          if (!data || !data.ok) {
            setError((data && data.error) ? String(data.error) : "Feed request failed.");
            return;
          }
          renderItems(data.items || []);
        } catch (e) {
          setError(String(e && e.message ? e.message : e));
        }
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          traceFilter = null;
          focusJobId = null;
          if (lblEl) lblEl.textContent = "Newest jobs (global).";
          clearBtn.hidden = true;
          loadFeed();
        });
      }

      loadFeed();
      setInterval(loadFeed, 2500);
    })();
  </script>
</body>
</html>`;
}
