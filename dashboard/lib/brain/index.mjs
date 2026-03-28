import * as memory from "./memory.mjs";

export const brain = {
  memory,
  
  // Core operations
  async init(repoRoot) {
    await memory.ensureBrainDir(repoRoot);
    await memory.syncFromProjectFiles(repoRoot);
    return { ok: true, initialized: true };
  },
  
  async think(repoRoot, question, options) {
    return memory.think(repoRoot, question, options);
  },
  
  async learn(repoRoot, fact, source) {
    return memory.learn(repoRoot, fact, source);
  },
  
  async log(repoRoot, activity) {
    return memory.logActivity(repoRoot, activity);
  },
  
  async getContext(repoRoot, query) {
    return memory.getContext(repoRoot, query);
  },
  
  async updateUser(repoRoot, context) {
    return memory.updateUserContext(repoRoot, context);
  },
  
  async readLayers(repoRoot) {
    return memory.readAllLayers(repoRoot);
  },
  
  async readLayer(repoRoot, layer) {
    return memory.readLayer(repoRoot, layer);
  },
  
  async writeLayer(repoRoot, layer, content) {
    return memory.writeLayer(repoRoot, layer, content);
  },
  
  async buildContext(repoRoot, options) {
    return memory.buildContextForLLM(repoRoot, options);
  },
  
  // New backbone operations (#564, #614)
  async getStats(repoRoot) {
    return memory.getContextStats(repoRoot);
  },
  
  async compactLog(repoRoot) {
    return memory.compactLog(repoRoot);
  },
  
  async curateDurable(repoRoot) {
    return memory.curateDurable(repoRoot);
  },
  
  async snapshot(repoRoot, layer, content) {
    return memory.snapshot(repoRoot, layer, content);
  },
  
  // Prompt caching (#613)
  async buildCachedContext(repoRoot) {
    // Returns stable context parts that can be reused across calls
    const layers = await memory.readAllLayers(repoRoot);
    return {
      identity: layers[memory.LAYERS.IDENTITY] || "",
      user: layers[memory.LAYERS.USER] || "",
      staticPrefix: `## IDENTITY\n\n${layers[memory.LAYERS.IDENTITY] || ""}\n\n## USER\n\n${layers[memory.LAYERS.USER] || ""}`
    };
  },
  
  layers: memory.LAYERS,
  config: memory.CONFIG
};

export default brain;
