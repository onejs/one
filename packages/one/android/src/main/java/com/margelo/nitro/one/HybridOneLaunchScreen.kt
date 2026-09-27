package com.margelo.nitro.one

// the android half of One.LaunchScreen. the system splash plays its own
// exit, so fade has nothing to change here.
class HybridOneLaunchScreen : HybridOneLaunchScreenSpec() {
    override fun preventAutoHide() {
        OneLaunchScreen.preventAutoHide()
    }

    override fun hide(fade: Boolean) {
        OneLaunchScreen.hide()
    }
}
