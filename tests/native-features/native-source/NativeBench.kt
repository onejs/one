package dev.onejs.nativefeatures

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// a large list prop with one changed row; onApplied reports the update tick
// once compose has taken the new rows, so javascript can time the round trip.
data class BenchRow(val id: Int, val title: String, val value: Double, val flag: Boolean)

@Composable
fun BenchList(rows: List<BenchRow>, tick: Int, onApplied: (Int) -> Unit, modifier: Modifier = Modifier) {
    LaunchedEffect(tick) { onApplied(tick) }
    LazyColumn(modifier = modifier.fillMaxSize()) {
        items(rows, key = { it.id }) { row ->
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Text(row.title, modifier = Modifier.weight(1f))
                Text(String.format("%.1f", row.value))
                if (row.flag) Text(" ✓")
            }
        }
    }
}
