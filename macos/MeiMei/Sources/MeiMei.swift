import AppKit
import SwiftUI
import os

private let servicesLog = Logger(subsystem: "com.agent.meimei.menubar", category: "Services")
private let controlLogPath = NSHomeDirectory() + "/.meimei/logs/MeiMeiControl.log"

// MARK: - Control log (append-only; never blocks UI)

enum MeiMeiControlLog {
  static func append(_ line: String) {
    let dir = (controlLogPath as NSString).deletingLastPathComponent
    try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
    let stamp = ISO8601DateFormatter().string(from: Date())
    let chunk = "[\(stamp)] \(line)\n"
    guard let data = chunk.data(using: .utf8) else { return }
    if FileManager.default.fileExists(atPath: controlLogPath) {
      if let h = FileHandle(forWritingAtPath: controlLogPath) {
        defer { try? h.close() }
        _ = try? h.seekToEnd()
        try? h.write(contentsOf: data)
      }
    } else {
      FileManager.default.createFile(atPath: controlLogPath, contents: data)
    }
  }
}

// MARK: - Launch services (sync paths for app delegate; async for menu)

enum MeiMeiLaunchServices {
  private static let repoRootKey = "meimei.repoRoot"
  private static let lastRepoKey = "meimei.lastRepoRoot"
  private static let startScriptName = "meimei-menubar-orchestrate-start.sh"
  private static let stopScriptName = "meimei-menubar-orchestrate-stop.sh"
  /// Written by `npm run menubar:install` so Control finds the checkout without opening Preferences.
  private static var repositoryRootFilePath: String {
    NSHomeDirectory() + "/.meimei/repository_root"
  }

  static func start() {
    guard let repo = resolveRepoRoot() else {
      servicesLog.warning(
        "Missing agent.meimei repository root — set it in MeiMei Control → Preferences, or build the app inside the repo (macos/MeiMei/build)."
      )
      return
    }
    if runScriptSync(named: startScriptName, repo: repo, arguments: [repo.path], timeoutSeconds: 120) {
      UserDefaults.standard.set(repo.path, forKey: lastRepoKey)
    }
  }

  static func stop() {
    if let repo = resolveRepoRootForStop() {
      _ = runScriptSync(named: stopScriptName, repo: repo, arguments: [repo.path], timeoutSeconds: 90)
      return
    }
    servicesLog.warning("No repo root for stop — unloading MeiMei LaunchAgents by plist path.")
    bootOutMeimeiLaunchAgents()
  }

  /// Runs off the main thread; does not block UI. Used from menu commands.
  static func runScriptAsync(
    named name: String,
    repo: URL,
    arguments: [String],
    timeoutSeconds: Int
  ) async -> (ok: Bool, output: String) {
    await withCheckedContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        let ok = runScriptSync(named: name, repo: repo, arguments: arguments, timeoutSeconds: timeoutSeconds)
        continuation.resume(returning: (ok, ""))
      }
    }
  }

  static func resolveRepoRootForMenu() -> URL? {
    resolveRepoRoot()
  }

  /// Async stop (orchestrate-stop or plist bootout); safe from menu without blocking main thread.
  static func stopPlatformAsync() async {
    await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
      DispatchQueue.global(qos: .userInitiated).async {
        MeiMeiLaunchServices.stop()
        cont.resume()
      }
    }
  }

  private static func resolveRepoRootForStop() -> URL? {
    if let u = resolveRepoRoot() { return u }
    let ud = UserDefaults.standard
    if let s = ud.string(forKey: lastRepoKey)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
      let u = URL(fileURLWithPath: (s as NSString).expandingTildeInPath)
      if FileManager.default.fileExists(atPath: u.appendingPathComponent("scripts/\(stopScriptName)").path) {
        return u
      }
    }
    return nil
  }

  private static func resolveRepoRoot() -> URL? {
    let ud = UserDefaults.standard
    if let s = ud.string(forKey: repoRootKey)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
      let u = URL(fileURLWithPath: (s as NSString).expandingTildeInPath)
      if FileManager.default.fileExists(atPath: u.appendingPathComponent("scripts/\(startScriptName)").path) {
        return u.standardizedFileURL
      }
    }

    if let u = repoRootFromInstallFile() {
      persistRepoRootIfEmpty(u)
      return u
    }

    if let raw = ProcessInfo.processInfo.environment["MEIMEI_REPO_ROOT"]?.trimmingCharacters(in: .whitespacesAndNewlines),
       !raw.isEmpty {
      let u = URL(fileURLWithPath: (raw as NSString).expandingTildeInPath)
      if FileManager.default.fileExists(atPath: u.appendingPathComponent("scripts/\(startScriptName)").path) {
        persistRepoRootIfEmpty(u)
        return u.standardizedFileURL
      }
    }

    let home = FileManager.default.homeDirectoryForCurrentUser
    let subs = [
      "Projects/agent.meimei",
      "Developer/agent.meimei",
      "Projects/agent-meimei",
      "Code/agent.meimei",
      "workspace/agent.meimei",
      "agent.meimei",
      "src/agent.meimei"
    ]
    for sub in subs {
      let u = home.appendingPathComponent(sub)
      if FileManager.default.fileExists(atPath: u.appendingPathComponent("scripts/\(startScriptName)").path) {
        persistRepoRootIfEmpty(u)
        return u.standardizedFileURL
      }
    }

    var url = Bundle.main.bundleURL.standardizedFileURL
    for _ in 0..<12 {
      let candidate = url.appendingPathComponent("scripts/\(startScriptName)")
      if FileManager.default.fileExists(atPath: candidate.path) {
        return url
      }
      let parent = url.deletingLastPathComponent()
      if parent.path == url.path { break }
      url = parent
    }
    return nil
  }

  private static func repoRootFromInstallFile() -> URL? {
    let path = repositoryRootFilePath
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)),
          let s = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
          !s.isEmpty
    else {
      return nil
    }
    let u = URL(fileURLWithPath: (s as NSString).expandingTildeInPath)
    guard FileManager.default.fileExists(atPath: u.appendingPathComponent("scripts/\(startScriptName)").path) else {
      return nil
    }
    return u.standardizedFileURL
  }

  /// Fill Preferences field once so the UI matches reality (only when user left repo root empty).
  private static func persistRepoRootIfEmpty(_ url: URL) {
    let ud = UserDefaults.standard
    let cur = ud.string(forKey: repoRootKey)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if cur.isEmpty {
      ud.set(url.path, forKey: repoRootKey)
    }
  }

  @discardableResult
  private static func runScriptSync(named name: String, repo: URL, arguments: [String], timeoutSeconds: Int) -> Bool {
    let scriptURL = repo.appendingPathComponent("scripts/\(name)")
    guard FileManager.default.fileExists(atPath: scriptURL.path) else {
      servicesLog.error("Missing script at \(scriptURL.path, privacy: .public)")
      MeiMeiControlLog.append("ERROR missing script \(scriptURL.path)")
      return false
    }
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/bin/bash")
    p.arguments = [scriptURL.path] + arguments
    p.currentDirectoryURL = repo
    let out = Pipe()
    p.standardOutput = out
    p.standardError = out

    do {
      try p.run()
    } catch {
      servicesLog.error("Process failed to start: \(String(describing: error), privacy: .public)")
      MeiMeiControlLog.append("ERROR \(name) failed to start: \(error)")
      return false
    }

    var timedOut = false
    let timeoutWork = DispatchWorkItem {
      timedOut = true
      MeiMeiControlLog.append("TIMEOUT \(name) after \(timeoutSeconds)s — sending SIGTERM")
      p.terminate()
    }
    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + .seconds(timeoutSeconds), execute: timeoutWork)

    p.waitUntilExit()
    timeoutWork.cancel()

    let data = out.fileHandleForReading.readDataToEndOfFile()
    let text = String(data: data, encoding: .utf8) ?? ""
    if !text.isEmpty {
      MeiMeiControlLog.append("\(name): \(text.trimmingCharacters(in: .whitespacesAndNewlines))")
    }

    if timedOut || p.terminationStatus != 0 {
      servicesLog.error("\(name, privacy: .public) exited \(p.terminationStatus) timedOut=\(timedOut): \(text, privacy: .public)")
      MeiMeiControlLog.append("ERROR \(name) exit \(p.terminationStatus) timedOut=\(timedOut)")
      return false
    }
    return true
  }

  private static func bootOutMeimeiLaunchAgents() {
    let uid = String(getuid())
    let la = NSHomeDirectory() + "/Library/LaunchAgents/"
    let names = [
      "com.agent.meimei.dashboard-ui.plist",
      "com.agent.meimei.dashboard-proxy.plist",
      "com.agent.meimei.dashboard-health.plist",
      "ai.openclaw.meimei.dashboard-ui.plist",
      "ai.openclaw.meimei.dashboard-proxy.plist",
      "ai.openclaw.meimei.dashboard-health.plist"
    ]
    for name in names {
      let path = la + name
      let bash = "launchctl bootout gui/\(uid) \"\(path)\" 2>/dev/null || true"
      let p = Process()
      p.executableURL = URL(fileURLWithPath: "/bin/bash")
      p.arguments = ["-lc", bash]
      try? p.run()
      p.waitUntilExit()
    }
  }
}

// MARK: - App delegate

final class AppDelegate: NSObject, NSApplicationDelegate {
  func applicationDidFinishLaunching(_ notification: Notification) {
    DispatchQueue.global(qos: .userInitiated).async {
      MeiMeiLaunchServices.start()
    }
  }

  func applicationWillTerminate(_ notification: Notification) {
    MeiMeiLaunchServices.stop()
  }
}

// MARK: - Health polling (reflects `/api/health` only; launchd owns auto-restart)

final class PlatformHealthController: ObservableObject {
  enum Indicator: String {
    case unknown
    case needsSetup
    case starting
    case healthy
    case unhealthy
  }

  @Published private(set) var indicator: Indicator = .unknown

  private var healthURLString = "http://127.0.0.1:45285/api/health"
  private var pollTask: Task<Void, Never>?
  /// After platform start, avoid showing red while Node/launchd comes up.
  private var graceUntil: Date?

  var statusLine: String {
    switch indicator {
    case .unknown: return "Status: …"
    case .needsSetup:
      return "Cannot find agent.meimei checkout (see Preferences or run npm run menubar:install from the repo)"
    case .starting: return "Status: starting…"
    case .healthy: return "Status: healthy"
    case .unhealthy: return "Status: unreachable (is platform started?)"
    }
  }

  var menuBarSymbolName: String {
    switch indicator {
    case .unknown: return "circle.dashed"
    case .needsSetup: return "exclamationmark.triangle.fill"
    case .starting: return "arrow.triangle.2.circlepath"
    case .healthy: return "checkmark.circle.fill"
    case .unhealthy: return "xmark.circle.fill"
    }
  }

  var menuBarTint: Color {
    switch indicator {
    case .unknown: return .secondary
    case .needsSetup: return .orange
    case .starting: return .orange
    case .healthy: return .green
    case .unhealthy: return .red
    }
  }

  /// Read UserDefaults and start polling (or show needs-setup). Call when the menu bar item appears — menu content may be lazy-loaded.
  func bootstrapFromDefaults() {
    let raw = UserDefaults.standard.string(forKey: "meimei.healthCheckURL")?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let url = raw.isEmpty ? "http://127.0.0.1:45285/api/health" : raw
    let configured = MeiMeiLaunchServices.resolveRepoRootForMenu() != nil
    configure(healthURLString: url, repositoryConfigured: configured)
  }

  /// Call from the main thread (SwiftUI `onAppear` / `onChange`).
  func configure(healthURLString url: String, repositoryConfigured: Bool) {
    pollTask?.cancel()
    pollTask = nil
    if !repositoryConfigured {
      graceUntil = nil
      indicator = .needsSetup
      return
    }
    healthURLString = url.trimmingCharacters(in: .whitespacesAndNewlines)
    graceUntil = Date().addingTimeInterval(45)
    indicator = .starting
    startPolling()
  }

  func startPolling() {
    pollTask?.cancel()
    pollTask = Task { [weak self] in
      guard let self else { return }
      while !Task.isCancelled {
        let (urlString, grace) = await MainActor.run { (self.healthURLString, self.graceUntil) }

        let ok = await Self.fetchHealthOK(urlString: urlString)
        await MainActor.run {
          if ok {
            self.graceUntil = nil
            self.indicator = .healthy
          } else if let g = grace, Date() < g {
            self.indicator = .starting
          } else {
            self.graceUntil = nil
            self.indicator = .unhealthy
          }
        }
        try? await Task.sleep(nanoseconds: 5_000_000_000)
      }
    }
  }

  func markStarting() {
    DispatchQueue.main.async {
      self.graceUntil = Date().addingTimeInterval(45)
      self.indicator = .starting
    }
  }

  /// Off main thread; `URLSession` async API.
  private static func fetchHealthOK(urlString: String) async -> Bool {
    let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let url = URL(string: trimmed),
      let scheme = url.scheme?.lowercased(),
      scheme == "http" || scheme == "https"
    else {
      return false
    }
    var request = URLRequest(url: url, timeoutInterval: 2.0)
    request.httpMethod = "GET"
    do {
      let (_, response) = try await URLSession.shared.data(for: request)
      let code = (response as? HTTPURLResponse)?.statusCode ?? 0
      return (200...299).contains(code)
    } catch {
      return false
    }
  }
}

// MARK: - App + menu

@main
struct MeiMeiApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  @StateObject private var platformHealth = PlatformHealthController()
  @AppStorage("meimei.healthCheckURL") private var healthCheckURL = "http://127.0.0.1:45285/api/health"

  var body: some Scene {
    MenuBarExtra {
      MenuRootView()
        .environmentObject(platformHealth)
    } label: {
      Image(systemName: platformHealth.menuBarSymbolName)
        .symbolRenderingMode(.palette)
        .foregroundStyle(platformHealth.menuBarTint, platformHealth.menuBarTint)
        .accessibilityLabel("MeiMei Control \(platformHealth.indicator.rawValue)")
        .onAppear {
          platformHealth.bootstrapFromDefaults()
        }
    }
    .menuBarExtraStyle(.menu)

    Settings {
      SettingsView()
    }
  }
}

struct MenuRootView: View {
  @EnvironmentObject private var platformHealth: PlatformHealthController
  @AppStorage("meimei.baseURL") private var baseURL = "https://meimei.localhost:8443"
  @AppStorage("meimei.healthCheckURL") private var healthCheckURL = "http://127.0.0.1:45285/api/health"
  @AppStorage("meimei.repoRoot") private var repoRoot = ""

  @State private var platformBusy = false

  private var dashboardHomeURL: String {
    "\(trimmedBase)/dashboard/"
  }

  var body: some View {
    Group {
    Text(platformHealth.statusLine)
      .foregroundStyle(platformHealth.indicator == .needsSetup ? Color.orange : Color.secondary)
      .disabled(true)

    if platformHealth.indicator == .needsSetup {
      Group {
        if #available(macOS 14.0, *) {
          SettingsLink {
            Text("Preferences…")
          }
        } else {
          Button("Preferences…") {
            NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
          }
        }
      }
      Text("Or reinstall: in the repo run npm run menubar:install")
        .font(.caption)
        .foregroundStyle(.secondary)
      Divider()
    }

    Button("Start platform") {
      runPlatformStart()
    }
    .disabled(platformBusy)

    Button("Stop platform") {
      runPlatformStop()
    }
    .disabled(platformBusy)

    Button("Restart platform") {
      runPlatformRestart()
    }
    .disabled(platformBusy)

    Divider()

    Button("Open dashboard in browser") {
      open(dashboardHomeURL)
    }

    Divider()

    Button("Reveal control log") {
      NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: controlLogPath)])
    }

    Group {
      if #available(macOS 14.0, *) {
        SettingsLink {
          Text("Preferences…")
        }
      } else {
        Button("Preferences…") {
          NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
        }
      }
    }

    Button("Quit MeiMei Control") {
      NSApplication.shared.terminate(nil)
    }
    }
    .onAppear {
      refreshHealthConfiguration()
    }
    .onChange(of: healthCheckURL) { _ in
      refreshHealthConfiguration()
    }
    .onChange(of: repoRoot) { _ in
      refreshHealthConfiguration()
      if MeiMeiLaunchServices.resolveRepoRootForMenu() != nil {
        DispatchQueue.global(qos: .userInitiated).async {
          MeiMeiLaunchServices.start()
        }
      }
    }
  }

  private func refreshHealthConfiguration() {
    let configured = MeiMeiLaunchServices.resolveRepoRootForMenu() != nil
    platformHealth.configure(healthURLString: healthCheckURL, repositoryConfigured: configured)
  }

  private var trimmedBase: String {
    baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
  }

  private func open(_ string: String) {
    guard let url = URL(string: string) else { return }
    NSWorkspace.shared.open(url)
  }

  private func runPlatformStart() {
    guard let repo = MeiMeiLaunchServices.resolveRepoRootForMenu() else {
      MeiMeiControlLog.append("Start: no repo root")
      let a = NSAlert()
      a.messageText = "Repository root required"
      a.informativeText =
        "MeiMei Control.app in Applications cannot find your agent.meimei checkout. Open Preferences → Local services and set “MeiMei repository root” (e.g. ~/Projects/agent.meimei), then try Start again."
      a.alertStyle = .informational
      a.addButton(withTitle: "OK")
      a.runModal()
      return
    }
    platformBusy = true
    platformHealth.markStarting()
    MeiMeiControlLog.append("Start platform (orchestrate-start)")
    Task {
      _ = await MeiMeiLaunchServices.runScriptAsync(
        named: "meimei-menubar-orchestrate-start.sh",
        repo: repo,
        arguments: [repo.path],
        timeoutSeconds: 120
      )
      await MainActor.run {
        platformBusy = false
        refreshHealthConfiguration()
      }
    }
  }

  private func runPlatformStop() {
    platformBusy = true
    platformHealth.markStarting()
    MeiMeiControlLog.append("Stop platform (orchestrate-stop / bootout)")
    Task {
      if let repo = MeiMeiLaunchServices.resolveRepoRootForMenu() {
        _ = await MeiMeiLaunchServices.runScriptAsync(
          named: "meimei-menubar-orchestrate-stop.sh",
          repo: repo,
          arguments: [repo.path],
          timeoutSeconds: 90
        )
      } else {
        await MeiMeiLaunchServices.stopPlatformAsync()
      }
      await MainActor.run {
        platformBusy = false
        refreshHealthConfiguration()
      }
    }
  }

  private func runPlatformRestart() {
    guard let repo = MeiMeiLaunchServices.resolveRepoRootForMenu() else {
      MeiMeiControlLog.append("Restart: no repo root")
      return
    }
    platformBusy = true
    platformHealth.markStarting()
    MeiMeiControlLog.append("Restart platform (stop then start)")
    Task {
      _ = await MeiMeiLaunchServices.runScriptAsync(
        named: "meimei-menubar-orchestrate-stop.sh",
        repo: repo,
        arguments: [repo.path],
        timeoutSeconds: 90
      )
      _ = await MeiMeiLaunchServices.runScriptAsync(
        named: "meimei-menubar-orchestrate-start.sh",
        repo: repo,
        arguments: [repo.path],
        timeoutSeconds: 120
      )
      await MainActor.run {
        platformBusy = false
        refreshHealthConfiguration()
      }
    }
  }
}

struct SettingsView: View {
  @AppStorage("meimei.baseURL") private var baseURL = "https://meimei.localhost:8443"
  @AppStorage("meimei.repoRoot") private var repoRoot = ""
  @AppStorage("meimei.healthCheckURL") private var healthCheckURL = "http://127.0.0.1:45285/api/health"

  var body: some View {
    Form {
      Section {
        TextField("MeiMei repository root (agent.meimei checkout)", text: $repoRoot, prompt: Text("~/Projects/agent.meimei"))
          .help(
            "Required if MeiMei Control.app is not inside the repo. On launch: starts HTTPS proxy + dashboard + health watcher. On quit: stops those services."
          )
      } header: {
        Text("Local services")
      }
      Section {
        TextField("Health check URL (GET /api/health)", text: $healthCheckURL)
          .help("Loopback dashboard liveness; must match config/dashboard-surface.v1.json listen port (default 45285).")
      } header: {
        Text("Status")
      }
      Section {
        TextField("HTTPS base URL (no trailing slash)", text: $baseURL)
          .help("Used for Open dashboard / Apps / Tools links (default local proxy).")
      } header: {
        Text("Browser")
      }
    }
    .padding()
    .frame(minWidth: 480)
  }
}
