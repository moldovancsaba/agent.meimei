import AppKit
import SwiftUI

/// MeiMei menu bar companion: quick links to the local dashboard and OpenClaw.
///
/// Uses SwiftUI `MenuBarExtra` (macOS 13+), which replaces the older `NSStatusItem` + `NSPopover`
/// pattern taught in many menu bar tutorials (e.g. Anagh Sharma’s **Ambar** template:
/// https://github.com/AnaghSharma/Ambar-SwiftUI — we could not find a public “Amanoba” course;
/// this app follows the same architectural idea: status item + SwiftUI content).
@main
struct MeiMeiApp: App {
  var body: some Scene {
    MenuBarExtra("MeiMei", systemImage: "sparkles.rectangle.stack.fill") {
      MenuRootView()
    }
    .menuBarExtraStyle(.menu)

    Settings {
      SettingsView()
    }
  }
}

struct MenuRootView: View {
  @AppStorage("meimei.baseURL") private var baseURL = "https://meimei.localhost:8443"
  @AppStorage("meimei.openclawChatURL") private var openclawChatURL = "http://127.0.0.1:18789/chat?session=main"

  var body: some View {
    Button("Open dashboard") {
      open("\(trimmedBase)/dashboard/")
    }
    Button("Apps") {
      open("\(trimmedBase)/apps")
    }
    Button("Tools") {
      open("\(trimmedBase)/tools")
    }
    Button("knowmore") {
      open("\(trimmedBase)/knowmore")
    }
    Button("Admin") {
      open("\(trimmedBase)/admin")
    }
    Divider()
    Button("OpenClaw chat") {
      open(openclawChatURL)
    }
    Divider()
    Button("Copy dashboard URL") {
      NSPasteboard.general.clearContents()
      NSPasteboard.general.setString("\(trimmedBase)/dashboard/", forType: .string)
    }
    Divider()
    Button("Preferences…") {
      NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
    }
    Button("Quit MeiMei") {
      NSApplication.shared.terminate(nil)
    }
  }

  private var trimmedBase: String {
    baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
  }

  private func open(_ string: String) {
    guard let url = URL(string: string) else { return }
    NSWorkspace.shared.open(url)
  }
}

struct SettingsView: View {
  @AppStorage("meimei.baseURL") private var baseURL = "https://meimei.localhost:8443"
  @AppStorage("meimei.openclawChatURL") private var openclawChatURL = "http://127.0.0.1:18789/chat?session=main"

  var body: some View {
    Form {
      TextField("MeiMei base URL (no trailing slash)", text: $baseURL)
      TextField("OpenClaw chat URL", text: $openclawChatURL)
    }
    .padding()
    .frame(minWidth: 400)
  }
}
