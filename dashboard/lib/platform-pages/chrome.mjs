/**
 * Shared dashboard chrome — global nav, flashcards, list helper.
 * @see docs/architecture/meimei-kernel-completion-plan.v1.md Phase K2
 * @version 1.0.0
 * @aligned package agent-meimei 0.8.15
 */

/**
 * @param {unknown[]} items
 * @param {{ escapeHtml: (s: string) => string }} d
 */
export function renderList(items, d) {
  const list = Array.isArray(items) ? items.map((item) => String(item).trim()).filter(Boolean) : [];
  if (!list.length) return "<li class=\"muted\">None</li>";
  return list.map((item) => `<li>${d.escapeHtml(item)}</li>`).join("");
}

/**
 * @param {{ kind: string, title: string, content: string, href?: string, button?: boolean, attrs?: string, settingsHref?: string, openInNewTab?: boolean }} opts
 * @param {{ escapeHtml: (s: string) => string }} d
 */
export function renderFlashcard(
  {
    kind,
    title,
    content,
    href = "",
    button = false,
    attrs = "",
    settingsHref = "",
    openInNewTab = false
  },
  d
) {
  const cardHtml = `<span class="ds-flashcard-kind">${d.escapeHtml(kind)}</span><h3 class="ds-flashcard-title">${d.escapeHtml(title)}</h3><div class="ds-flashcard-content">${d.escapeHtml(content)}</div>`;
  if (button) {
    return `<button type="button" class="ds-flashcard"${attrs ? ` ${attrs}` : ""}>${cardHtml}</button>`;
  }
  const settingsLink = settingsHref
    ? `<a class="ds-flashcard-settings" href="${d.escapeHtml(settingsHref)}" title="Settings" onclick="event.stopPropagation();">⚙️</a>`
    : "";
  const newTabAttrs = openInNewTab ? ` target="_blank" rel="noopener noreferrer"` : "";
  return `<a class="ds-flashcard" href="${d.escapeHtml(href)}"${newTabAttrs}>${cardHtml}${settingsLink}</a>`;
}

/**
 * @param {string} activePage
 * @param {{
 *   escapeHtml: (s: string) => string,
 *   navIconAppsPath: string,
 *   navIconToolsPath: string,
 *   navIconDashboardPath: string,
 *   navIconKnowmorePath: string,
 *   navIconAdminPath: string,
 *   appsRoute: string,
 *   toolsRoute: string,
 *   homeRoute: string,
 *   knowmoreRoute: string,
 *   adminRoute: string
 * }} d
 */
export function renderGlobalNav(activePage, d) {
  const navId = "global-nav-actions";
  const toggleId = "global-nav-toggle";
  return `
      <button
        id="${toggleId}"
        class="nav-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="${navId}"
      >
        Menu
      </button>
      <div id="${navId}" class="nav-actions" data-nav-actions>
        <a class="nav-chip nav-dest-apps ${activePage === "apps" ? "active" : ""}" href="${d.escapeHtml(d.appsRoute)}">
          <img src="${d.escapeHtml(d.navIconAppsPath)}" alt="" width="24" height="24" />
          <span>Apps</span>
        </a>
        <a class="nav-chip nav-dest-tools ${activePage === "tools" ? "active" : ""}" href="${d.escapeHtml(d.toolsRoute)}">
          <img src="${d.escapeHtml(d.navIconToolsPath)}" alt="" width="24" height="24" />
          <span>Tools</span>
        </a>
        <a class="nav-chip nav-dest-dashboard ${activePage === "dashboard" ? "active" : ""}" href="${d.escapeHtml(d.homeRoute)}">
          <img src="${d.escapeHtml(d.navIconDashboardPath)}" alt="" width="24" height="24" />
          <span>Dashboard</span>
        </a>
        <a class="nav-chip nav-dest-knowmore ${activePage === "knowmore" ? "active" : ""}" href="${d.escapeHtml(d.knowmoreRoute)}">
          <img src="${d.escapeHtml(d.navIconKnowmorePath)}" alt="" width="24" height="24" />
          <span>knowmore</span>
        </a>
        <a class="nav-chip nav-dest-admin ${activePage === "admin" ? "active" : ""}" href="${d.escapeHtml(d.adminRoute)}">
          <img src="${d.escapeHtml(d.navIconAdminPath)}" alt="" width="24" height="24" />
          <span>Admin</span>
        </a>
      </div>`;
}

export function renderGlobalNavScript() {
  return `
    (function initGlobalNav() {
      const nav = document.querySelector('[data-nav-actions]');
      const toggle = document.getElementById('global-nav-toggle');
      if (!nav || !toggle) return;

      function closeNav() {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }

      function openNav() {
        nav.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }

      function syncForViewport() {
        if (window.matchMedia('(min-width: 901px)').matches) {
          openNav();
        } else {
          closeNav();
        }
      }

      toggle.addEventListener('click', () => {
        if (nav.classList.contains('is-open')) {
          closeNav();
          return;
        }
        openNav();
      });

      window.addEventListener('resize', syncForViewport);
      syncForViewport();
    })();
  `;
}
