// executable state-machine probe, independent of UIKit and the simulator.
@main
struct VerifyControlled {
  static func main() {
    var state = OneNativeControlled("first")
    precondition(state.applying("first", acknowledged: 0, revision: 0) == nil, "unchanged props must not publish")
    precondition(state.change("second"))
    if let next = state.applying("first", acknowledged: 0, revision: 0) { state = next }
    precondition(state.value == "second", "an unacknowledged prop must not erase a tap")
    if let next = state.applying("first", acknowledged: 1, revision: 0) { state = next }
    precondition(state.value == "first", "an acknowledged rejection must restore the prop")
    state.change("second")
    state.change("third")
    if let next = state.applying("second", acknowledged: 2, revision: 0) { state = next }
    precondition(state.value == "third", "an older ack must not overwrite a newer tap")
    if let next = state.applying("third", acknowledged: 3, revision: 0) { state = next }
    precondition(!state.change("third"), "an unchanged value must not emit")
    state.change("fourth")
    if let next = state.applying("reset", acknowledged: 0, revision: 1) { state = next }
    precondition(state.value == "reset" && state.eventCount == 0 && state.revision == 1)
    var sources = OneNativeControlled([true, false])
    sources.change([true, true])
    if let next = sources.applying([true, false], acknowledged: 0, revision: 0) { sources = next }
    precondition(sources.value == [true, true], "mixed sources must update before React returns")
    if let next = sources.applying([true, false], acknowledged: 1, revision: 0) { sources = next }
    precondition(sources.value == [true, false])
    print("controlled state: acceptance, rejection, stale acknowledgments, reset, mixed sources passed")
  }
}
