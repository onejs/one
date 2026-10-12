import NitroModules

// the ios half of One.LaunchScreen. the hold itself lives in
// OneLaunchScreen.m, where the app delegate installs it.
final class HybridOneLaunchScreen: HybridOneLaunchScreenSpec {
  func preventAutoHide() throws {
    OneLaunchScreenPreventAutoHide()
  }

  func hide(fade: Bool) throws {
    OneLaunchScreenHide(fade)
  }
}
