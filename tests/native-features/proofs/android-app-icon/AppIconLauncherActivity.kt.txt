package dev.vxrn.nativefeatures.tests

import android.app.Activity
import android.content.Intent
import android.os.Bundle

// launcher aliases finish before react native mounts in the permanent host.
class AppIconLauncherActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivity(Intent(intent).setClass(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP))
        finish()
    }
}
