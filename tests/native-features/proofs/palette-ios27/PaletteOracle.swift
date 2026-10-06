import SwiftUI

// matches OneNativeMenuRoot's Menu and its palette control group, without One.
struct PaletteReference: View {
  @State private var lastAction = "none"
  @State private var checked = true
  @State private var mixed = true

  var body: some View {
    VStack {
      Text("Menu action: \(lastAction)")
      Spacer()
      Menu {
        Button("Copy", systemImage: "doc.on.doc") { lastAction = "copy" }
        Toggle("Checked", systemImage: "checkmark.circle", isOn: $checked)
          .menuActionDismissBehavior(.disabled)
        Button("Disabled", systemImage: "xmark.circle") { }
          .disabled(true)
        Button("Keep Open", systemImage: "pin") { lastAction = "keep-open" }
          .menuActionDismissBehavior(.disabled)
        Menu("More", systemImage: "ellipsis.circle") {
          Button("Nested A", systemImage: "star") { }
          Button("Nested B", role: .destructive) { }
          Menu("Deeper") { Button("Deep 1") { } }
        }
        ControlGroup {
          Button("Bold", systemImage: "bold") { lastAction = "bold" }
          Button("Italic", systemImage: "italic") { lastAction = "italic" }
        } label: { Text("Tools") }
        .controlGroupStyle(.palette)
        Divider()
        Section("Sources") { Toggle("Mixed", isOn: $mixed) }
      } label: {
        Text("Open native menu")
          .frame(width: 329, height: 68)
          .background(Color(white: 0.9333))
      }
      .menuStyle(.button)
      .buttonStyle(.plain)
      .menuOrder(.fixed)
      .accessibilityLabel("Open native menu")
      Spacer().frame(height: 132)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.white)
    .preferredColorScheme(.light)
  }
}

@main
struct PaletteApp: App {
  var body: some Scene { WindowGroup { PaletteReference() } }
}
