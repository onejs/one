package dev.onejs.one.sharetarget

import android.net.Uri

// a place the user can send a share submission to (an account, a channel,
// a conversation...); the generated adapter decides what these mean.
data class ShareDestination(
    val id: String,
    val title: String,
    val subtitle: String? = null,
)

sealed class ShareItem {
    data class Text(val value: String) : ShareItem()

    data class Url(val value: String) : ShareItem()

    // uri points at a file this process owns (copied into private storage
    // by OneShareIntake), never at the original content:// uri the sender
    // granted only for the lifetime of the share intent.
    data class File(
        val uri: Uri,
        val name: String,
        val mimeType: String,
        val size: Long,
    ) : ShareItem()
}

// id is the stable draft id, stable across rotation/process recreation so
// the adapter and any retry logic can recognize a resubmission.
data class ShareSubmission(
    val id: String,
    val destinationId: String,
    val text: String,
    val items: List<ShareItem>,
)
