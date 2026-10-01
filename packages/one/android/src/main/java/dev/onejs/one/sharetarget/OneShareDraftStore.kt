package dev.onejs.one.sharetarget

import android.content.Context
import android.net.Uri
import java.io.File
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

internal data class StoredShareDraft(
    val id: String,
    val destinationId: String?,
    val editedText: String,
    val items: List<ShareItem>,
)

// durable store for one in-flight share draft per id, under the app's
// private files dir. a draft's attachment files live alongside its json so
// deleting the draft directory on success/cancel reclaims both in one call.
internal class OneShareDraftStore(private val context: Context) {
    private fun rootDir(): File = File(context.filesDir, "one-sharetarget").apply { mkdirs() }

    private fun draftDir(id: String): File = File(rootDir(), id)

    private fun draftFile(id: String): File = File(draftDir(id), "draft.json")

    fun newDraftId(): String = UUID.randomUUID().toString()

    fun itemsDirectory(id: String): File = draftDir(id).apply { mkdirs() }

    fun load(id: String): StoredShareDraft? {
        val file = draftFile(id)
        if (!file.exists()) return null
        return try {
            val json = JSONObject(file.readText())
            val items = mutableListOf<ShareItem>()
            val itemsJson = json.optJSONArray("items") ?: JSONArray()
            for (i in 0 until itemsJson.length()) {
                val entry = itemsJson.getJSONObject(i)
                when (entry.getString("type")) {
                    "text" -> items.add(ShareItem.Text(entry.getString("value")))
                    "url" -> items.add(ShareItem.Url(entry.getString("value")))
                    "file" ->
                        items.add(
                            ShareItem.File(
                                uri = Uri.parse(entry.getString("uri")),
                                name = entry.getString("name"),
                                mimeType = entry.getString("mimeType"),
                                size = entry.getLong("size"),
                            )
                        )
                    else -> continue
                }
            }
            StoredShareDraft(
                id = id,
                destinationId = json.optString("destinationId", "").takeIf { it.isNotEmpty() },
                editedText = json.optString("editedText", ""),
                items = items,
            )
        } catch (_: Exception) {
            null
        }
    }

    fun save(draft: StoredShareDraft) {
        val itemsJson = JSONArray()
        for (item in draft.items) {
            val entry = JSONObject()
            when (item) {
                is ShareItem.Text -> entry.put("type", "text").put("value", item.value)
                is ShareItem.Url -> entry.put("type", "url").put("value", item.value)
                is ShareItem.File ->
                    entry
                        .put("type", "file")
                        .put("uri", item.uri.toString())
                        .put("name", item.name)
                        .put("mimeType", item.mimeType)
                        .put("size", item.size)
            }
            itemsJson.put(entry)
        }
        val json =
            JSONObject()
                .put("destinationId", draft.destinationId ?: JSONObject.NULL)
                .put("editedText", draft.editedText)
                .put("items", itemsJson)

        val dir = draftDir(draft.id).apply { mkdirs() }
        val file = File(dir, "draft.json")
        val tmp = File(dir, "draft.json.tmp")
        tmp.writeText(json.toString())
        if (!tmp.renameTo(file)) {
            tmp.copyTo(file, overwrite = true)
            tmp.delete()
        }
    }

    fun delete(id: String) {
        draftDir(id).deleteRecursively()
    }
}
