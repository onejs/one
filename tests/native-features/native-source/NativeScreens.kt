package dev.onejs.nativefeatures

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// every screen of the native-screens routes. state lives in JavaScript and
// arrives as parameters; edits go back through callbacks.
data class Entry(val id: String, val title: String, val notes: String, val done: Boolean)

@Composable
fun EntryList(
    entries: List<Entry>,
    onSelect: (String) -> Unit,
    onAdd: () -> Unit,
    onSort: () -> Unit,
    modifier: Modifier = Modifier
) {
    var query by remember { mutableStateOf("") }
    val shown = if (query.isEmpty()) entries else entries.filter { it.title.contains(query, ignoreCase = true) }
    Column(modifier = modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Search") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = onSort) { Text("Sort") }
            Button(onClick = onAdd) { Text("Add") }
        }
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(shown, key = { it.id }) { entry ->
                ListItem(
                    headlineContent = { Text(entry.title) },
                    supportingContent = if (entry.notes.isEmpty()) null else ({ Text(entry.notes, maxLines = 1) }),
                    trailingContent = if (entry.done) ({ Text("Done") }) else null,
                    modifier = Modifier.clickable { onSelect(entry.id) }
                )
                HorizontalDivider()
            }
        }
    }
}

@Composable
fun EntryDetail(entry: Entry, onChange: (Entry) -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedTextField(
            value = entry.title,
            onValueChange = { onChange(entry.copy(title = it)) },
            label = { Text("Title") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = entry.done, onCheckedChange = { onChange(entry.copy(done = it)) })
            Text("Done")
        }
        OutlinedTextField(
            value = entry.notes,
            onValueChange = { onChange(entry.copy(notes = it)) },
            label = { Text("Notes") },
            minLines = 3,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun SortSheet(order: String, onSelect: (String) -> Unit, onClose: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Text("Sort")
        listOf("title" to "By title", "done" to "Done last").forEach { (option, label) ->
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onSelect(option) },
                verticalAlignment = Alignment.CenterVertically
            ) {
                RadioButton(selected = option == order, onClick = { onSelect(option) })
                Text(label)
            }
        }
        TextButton(onClick = onClose) { Text("Done") }
    }
}

@Composable
fun EntryForm(onSubmit: (String, String) -> Unit, onCancel: () -> Unit, modifier: Modifier = Modifier) {
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Title") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Notes") },
            minLines = 3,
            modifier = Modifier.fillMaxWidth()
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = onCancel) { Text("Cancel") }
            Button(onClick = { onSubmit(title, notes) }, enabled = title.isNotEmpty()) { Text("Save") }
        }
    }
}
