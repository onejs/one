package com.margelo.nitro.one

// the android half of One.LaunchScreen. fade shapes the system splash's exit
// on android 12+, where preventAutoHide takes the exit over.
class HybridOneLaunchScreen : HybridOneLaunchScreenSpec() {
    override fun preventAutoHide() {
        OneLaunchScreen.preventAutoHide()
    }

    override fun hide(fade: Boolean) {
        OneLaunchScreen.hide(fade)
    }
}
