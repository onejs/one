import SwiftUI
import UIKit

struct OneNativeAdaptivePanelRoot: View {
  @ObservedObject var model: OneNativeAdaptivePanelModel
  @Environment(\.horizontalSizeClass) private var sizeClass
  private var placement: String {
    guard model.controlled.value, model.content != nil else { return "hidden" }
    return sizeClass == .regular ? "regular" : "compact"
  }
  // adaptation flips placement, not open: each binding only closes when its
  // own presentation dismisses while it is the active placement.
  private var sheetPresented: Binding<Bool> {
    Binding(
      get: { model.controlled.value && model.content != nil && placement == "compact" },
      set: { value in if !value && placement == "compact" { model.change(false) } }
    )
  }
  private var inspectorPresented: Binding<Bool> {
    Binding(
      get: { model.controlled.value && model.content != nil && placement == "regular" },
      set: { value in if !value && placement == "regular" { model.change(false) } }
    )
  }
  @ViewBuilder private var content: some View {
    if let content = model.content {
      OneNativeSlot(content: content, mode: .presented, onLayout: { frame in
        if model.active && model.controlled.value { model.onLayout?(frame) }
      })
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .onGeometryChange(for: CGRect.self) { proxy in
        proxy.frame(in: .global)
      } action: { frame in
        if model.active && model.controlled.value {
          let placement: String = sizeClass == .regular ? "regular" : "compact"
          model.reportLayout(placement, frame)
        }
      }
    }
  }
  var body: some View {
    // one content view, two native presentations: a nonmodal sheet in compact
    // and a nonmodal inspector in regular. only one binding is true at a
    // time, so adaptation dismisses one and presents the other with the same
    // react native view, preserving react state.
    Color.clear
      .sheet(isPresented: sheetPresented) {
        content
          .presentationDetents(model.detents, selection: Binding(
            get: { model.selectedPresentationDetent },
            set: { model.changeDetent($0) }
          ))
          .presentationBackgroundInteraction(.enabled)
      }
      .inspector(isPresented: inspectorPresented) {
        content
          .inspectorColumnWidth(model.regularWidth)
      }
      .onChange(of: model.controlled.value) { _, open in
        if model.active && !open { model.reportLayout("hidden", .zero) }
      }
      .task(id: placement) {
        if model.active && placement == "hidden" { model.reportLayout("hidden", .zero) }
      }
  }
}
