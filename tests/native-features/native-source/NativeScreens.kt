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
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.unit.dp

data class Entry(val id: String, val title: String, val notes: String, val done: Boolean)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryList(entries: List<Entry>, onSelect: (String) -> Unit, onAdd: () -> Unit, onSort: () -> Unit, modifier: Modifier = Modifier) {
    var query by remember { mutableStateOf("") }
    val shown = if (query.isEmpty()) entries else entries.filter { it.title.contains(query, ignoreCase = true) }
    val scroll = TopAppBarDefaults.enterAlwaysScrollBehavior()
    Scaffold(
        modifier = modifier.fillMaxSize().nestedScroll(scroll.nestedScrollConnection),
        topBar = {
            TopAppBar(
                title = { Text("Entries") },
                actions = {
                    TextButton(onClick = onSort) { Text("Sort") }
                    TextButton(onClick = onAdd) { Text("Add") }
                },
                scrollBehavior = scroll,
            )
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding)) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Search") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                )
            }
            items(shown, key = { it.id }) { entry ->
                ListItem(
                    headlineContent = { Text(entry.title) },
                    supportingContent = if (entry.notes.isEmpty()) null else ({ Text(entry.notes, maxLines = 1) }),
                    trailingContent = if (entry.done) ({ Text("Done") }) else null,
                    modifier = Modifier.clickable { onSelect(entry.id) },
                )
                HorizontalDivider()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryDetail(entry: Entry, onChange: (Entry) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = { TopAppBar(title = { Text("Entry") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } }) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(value = entry.title, onValueChange = { onChange(entry.copy(title = it)) }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = entry.done, onCheckedChange = { onChange(entry.copy(done = it)) })
                Text("Done")
            }
            OutlinedTextField(value = entry.notes, onValueChange = { onChange(entry.copy(notes = it)) }, label = { Text("Notes") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SortSheet(order: String, onSelect: (String) -> Unit, onClose: () -> Unit, modifier: Modifier = Modifier) {
    Scaffold(modifier = modifier.fillMaxWidth(), topBar = { TopAppBar(title = { Text("Sort") }, actions = { TextButton(onClick = onClose) { Text("Done") } }) }) { padding ->
        Column(modifier = Modifier.fillMaxWidth().padding(padding).padding(16.dp)) {
            listOf("title" to "By title", "done" to "Done last").forEach { (option, label) ->
                Row(modifier = Modifier.fillMaxWidth().clickable { onSelect(option) }, verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = option == order, onClick = { onSelect(option) })
                    Text(label)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntryForm(onSubmit: (String, String) -> Unit, onCancel: () -> Unit, modifier: Modifier = Modifier) {
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = { TopAppBar(title = { Text("New entry") }, navigationIcon = { IconButton(onClick = onCancel) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } }, actions = { TextButton(onClick = { onSubmit(title, notes) }, enabled = title.isNotEmpty()) { Text("Save") } }) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = notes, onValueChange = { notes = it }, label = { Text("Notes") }, minLines = 3, modifier = Modifier.fillMaxWidth())
        }
    }
}
