/**
 * App Router - Dynamic app loading
 * 
 * Loads app modules from apps/ directory based on registry ID.
 * Supports hot-reloading during development.
 */

const appHandlers = new Map();
const appPages = new Map();
const appSettings = new Map();

async function loadAppModule(appId) {
  try {
    const module = await import(`../apps/${appId}/index.mjs`);
    return module;
  } catch (error) {
    return null;
  }
}

async function getHandler(appId) {
  if (appHandlers.has(appId)) {
    return appHandlers.get(appId);
  }
  
  const module = await loadAppModule(appId);
  if (module && module.handleApi) {
    appHandlers.set(appId, module.handleApi);
    return module.handleApi;
  }
  
  return null;
}

async function getPage(appId) {
  if (appPages.has(appId)) {
    return appPages.get(appId);
  }
  
  const module = await loadAppModule(appId);
  if (module && module.renderPage) {
    appPages.set(appId, module.renderPage);
    return module.renderPage;
  }
  
  return null;
}

async function getSettings(appId) {
  if (appSettings.has(appId)) {
    return appSettings.get(appId);
  }
  
  const module = await loadAppModule(appId);
  if (module && module.renderSettings) {
    appSettings.set(appId, module.renderSettings);
    return module.renderSettings;
  }
  
  return null;
}

async function routeToApp(appId, req, body) {
  const handler = await getHandler(appId);
  
  if (!handler) {
    return { ok: false, error: `App not found: ${appId}` };
  }
  
  try {
    return await handler(req, body);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function renderAppPage(appId, layoutDoc, pageType = "page") {
  if (pageType === "settings") {
    const renderer = await getSettings(appId);
    if (renderer) return renderer(layoutDoc);
  } else {
    const renderer = await getPage(appId);
    if (renderer) return renderer(layoutDoc);
  }
  
  return null;
}

function getAvailableApps() {
  return [
    "inbox",
    "lead-enrichment", 
    "memory",
    "mission-control",
    "what-next",
    "explain-it",
    "daily-briefing",
    "ai-routing"
  ];
}

export {
  getHandler,
  getPage,
  getSettings,
  routeToApp,
  renderAppPage,
  getAvailableApps,
  loadAppModule
};
