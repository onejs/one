import SwiftUI

// every screen of the native-screens routes. state lives in JavaScript and
// arrives as props; edits go back through callbacks. the views are plain
// SwiftUI, as they would be inside a UIHostingController.
struct Entry: Codable {
  var id: String
  var title: String
  var notes: String
  var done: Bool
}

public struct EntryList: View {
  let entries: [Entry]
  let onSelect: (String) -> Void
  let onAdd: () -> Void
  let onSort: () -> Void

  @State private var query = ""

  private var shown: [Entry] {
    query.isEmpty ? entries : entries.filter { $0.title.localizedCaseInsensitiveContains(query) }
  }

  public var body: some View {
    List(shown, id: \.id) { entry in
      Button {
        onSelect(entry.id)
      } label: {
        HStack {
          VStack(alignment: .leading) {
            Text(entry.title).foregroundStyle(Color.primary)
            if !entry.notes.isEmpty {
              Text(entry.notes).font(.footnote).foregroundStyle(Color.secondary).lineLimit(1)
            }
          }
          Spacer()
          if entry.done {
            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
          }
        }
      }
    }
    .navigationTitle("Entries")
    #if os(iOS)
    .navigationBarTitleDisplayMode(.large)
    #endif
    .searchable(text: $query)
    #if os(iOS)
    .toolbar {
      ToolbarItem(placement: .topBarLeading) {
        Button("Sort", action: onSort)
      }
      ToolbarItem(placement: .topBarTrailing) {
        Button("Add", systemImage: "plus", action: onAdd)
      }
    }
    #endif
  }
}

public struct EntryDetail: View {
  let entry: Entry
  let onChange: (Entry) -> Void

  public var body: some View {
    Form {
      Section("Title") {
        TextField("Title", text: Binding(
          get: { entry.title },
          set: { value in
            var next = entry
            next.title = value
            onChange(next)
          }))
      }
      Section {
        Toggle("Done", isOn: Binding(
          get: { entry.done },
          set: { value in
            var next = entry
            next.done = value
            onChange(next)
          }))
      }
      Section("Notes") {
        TextField("Notes", text: Binding(
          get: { entry.notes },
          set: { value in
            var next = entry
            next.notes = value
            onChange(next)
          }), axis: .vertical)
          .lineLimit(3...6)
      }
    }
    .navigationTitle(entry.title)
    #if os(iOS)
    .navigationBarTitleDisplayMode(.inline)
    #endif
  }
}

public struct SortSheet: View {
  let order: String
  let onSelect: (String) -> Void
  let onClose: () -> Void

  public var body: some View {
    List {
      ForEach(["title", "done"], id: \.self) { option in
        Button {
          onSelect(option)
        } label: {
          HStack {
            Text(option == "title" ? "By title" : "Done last").foregroundStyle(Color.primary)
            Spacer()
            if option == order {
              Image(systemName: "checkmark").foregroundStyle(.tint)
            }
          }
        }
      }
    }
    .navigationTitle("Sort")
    #if os(iOS)
    .navigationBarTitleDisplayMode(.inline)
    #endif
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Done", action: onClose)
      }
    }
  }
}

public struct EntryForm: View {
  let onSubmit: (String, String) -> Void
  let onCancel: () -> Void

  @State private var title = ""
  @State private var notes = ""

  public var body: some View {
    Form {
      Section("New entry") {
        TextField("Title", text: $title)
          .submitLabel(.done)
        TextField("Notes", text: $notes, axis: .vertical)
          .lineLimit(3...6)
      }
    }
    .navigationTitle("New entry")
    #if os(iOS)
    .navigationBarTitleDisplayMode(.inline)
    #endif
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button("Cancel", action: onCancel)
      }
      ToolbarItem(placement: .confirmationAction) {
        Button("Save") { onSubmit(title, notes) }
          .disabled(title.isEmpty)
      }
    }
  }
}
