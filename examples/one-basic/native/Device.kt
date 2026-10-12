import android.os.Build
import androidx.compose.material3.Slider
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import dev.onejs.one.source.OneModule
import java.security.MessageDigest

// each function is an async function in typescript: `await Device.sha256('hi')`.
// one generates Device.d.kt.ts from these signatures.
object Device : OneModule {
    fun info(): Map<String, String> = mapOf(
        "language" to "Kotlin",
        "model" to Build.MODEL,
        "system" to "Android ${Build.VERSION.RELEASE}",
    )

    fun sha256(text: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(text.toByteArray())
            .joinToString("") { "%02x".format(it) }
}

// a public composable is a react component: `<Level value={0.4} onChange={...} />`.
@Composable
fun Level(value: Double, onChange: (Double) -> Unit, modifier: Modifier = Modifier) {
    Slider(
        value = value.toFloat(),
        onValueChange = { onChange(it.toDouble()) },
        modifier = modifier,
    )
}
