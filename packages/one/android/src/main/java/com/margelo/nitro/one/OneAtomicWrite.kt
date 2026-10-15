package com.margelo.nitro.one

import android.system.Os
import java.io.File
import java.io.FileOutputStream

// replaces a file whole: the bytes go to a sibling temp file that renames
// over the target, so a reader that already opened or mapped the old file
// keeps it intact and nobody sees a partial write. truncating in place
// faults a reader that mapped the file (SIGBUS).
internal fun writeAtomically(target: File, bytes: ByteArray) {
    val staging = File.createTempFile(".one-write-", null, target.parentFile)
    try {
        FileOutputStream(staging).use { it.write(bytes) }
        Os.rename(staging.path, target.path)
    } finally {
        staging.delete()
    }
}
