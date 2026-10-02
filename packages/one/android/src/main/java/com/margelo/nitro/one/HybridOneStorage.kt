package com.margelo.nitro.one

import com.margelo.nitro.NitroModules
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.RandomAccessFile

// app key-value storage. entries live in one process-wide map, so a read never
// leaves memory. each write appends one record to a log file with a single
// write call, so it survives an app crash once the call returns, and the log
// is rewritten as a snapshot when it grows past twice the live data. every
// hybrid instance shares the one store, since two in-memory copies over the
// same log would lose writes.
class HybridOneStorage : HybridOneStorageSpec() {
    override fun getItem(key: String): String? = OneStorageLog.get(key)

    override fun setItem(key: String, value: String) = OneStorageLog.set(key, value)

    override fun removeItem(key: String) = OneStorageLog.remove(key)

    override fun getAllKeys(): Array<String> = OneStorageLog.keys()
}

// record layout, little endian: op (1 set, 2 remove), key length (u32), key
// utf8, then for a set the value length (u32) and value utf8.
private object OneStorageLog {
    private const val SET_OP: Byte = 1
    private const val REMOVE_OP: Byte = 2
    private const val COMPACT_FLOOR = 64 * 1024

    private val entries = HashMap<String, String>()
    private var out: FileOutputStream? = null
    private var record = ByteArray(256)
    private var recordSize = 0
    private var logBytes = 0L
    private var liveBytes = 0L
    private val file: File by lazy {
        val context = NitroModules.applicationContext
            ?: throw OneNativeError("E_STORAGE_UNAVAILABLE", "Storage: React context is not ready")
        File(context.filesDir, "one/storage.log")
    }

    @Synchronized
    fun get(key: String): String? {
        check(key)
        open()
        return entries[key]
    }

    @Synchronized
    fun set(key: String, value: String) {
        check(key)
        val stream = open()
        val keyBytes = key.toByteArray(Charsets.UTF_8)
        val valueBytes = value.toByteArray(Charsets.UTF_8)
        encode(SET_OP, keyBytes, valueBytes)
        write(stream)
        val previous = entries.put(key, value)
        if (previous != null) liveBytes -= setSize(key, previous)
        liveBytes += recordSize
        compactIfNeeded()
    }

    @Synchronized
    fun remove(key: String) {
        check(key)
        val stream = open()
        val previous = entries[key] ?: return
        encode(REMOVE_OP, key.toByteArray(Charsets.UTF_8), null)
        write(stream)
        entries.remove(key)
        liveBytes -= setSize(key, previous)
        compactIfNeeded()
    }

    @Synchronized
    fun keys(): Array<String> {
        open()
        return entries.keys.toTypedArray()
    }

    private fun check(key: String) {
        if (key.isEmpty()) throw OneNativeError("E_STORAGE_INPUT", "Storage: key must be a non-empty string")
    }

    private fun utf8Size(text: String): Int {
        var size = 0
        var index = 0
        while (index < text.length) {
            val char = text[index]
            size += when {
                char.code < 0x80 -> 1
                char.code < 0x800 -> 2
                Character.isHighSurrogate(char) && index + 1 < text.length && Character.isLowSurrogate(text[index + 1]) -> {
                    index++
                    4
                }
                else -> 3
            }
            index++
        }
        return size
    }

    private fun setSize(key: String, value: String): Long = 9L + utf8Size(key) + utf8Size(value)

    private fun encode(op: Byte, key: ByteArray, value: ByteArray?) {
        val size = 5 + key.size + if (value == null) 0 else 4 + value.size
        if (record.size < size) record = ByteArray(maxOf(size, record.size * 2))
        record[0] = op
        var offset = putField(1, key)
        if (value != null) offset = putField(offset, value)
        recordSize = offset
    }

    private fun putField(start: Int, bytes: ByteArray): Int {
        val length = bytes.size
        record[start] = length.toByte()
        record[start + 1] = (length ushr 8).toByte()
        record[start + 2] = (length ushr 16).toByte()
        record[start + 3] = (length ushr 24).toByte()
        System.arraycopy(bytes, 0, record, start + 4, length)
        return start + 4 + length
    }

    // one write(2) per record: the bytes reach the kernel before the call
    // returns, so an app crash right after it keeps them.
    private fun write(stream: FileOutputStream) {
        try {
            stream.write(record, 0, recordSize)
        } catch (error: IOException) {
            // a short write leaves a partial record that the next replay drops.
            runCatching { stream.channel.truncate(logBytes) }
            throw OneNativeError("E_STORAGE_WRITE", "Storage: ${error.message}")
        }
        logBytes += recordSize
    }

    // replays the log once per process. a record cut short by a crash mid-write
    // is dropped and the file truncated to the last whole record.
    private fun open(): FileOutputStream {
        out?.let { return it }
        try {
            file.parentFile?.mkdirs()
            val data = if (file.exists()) file.readBytes() else ByteArray(0)
            entries.clear()
            liveBytes = 0
            val valid = replay(data)
            if (valid < data.size) RandomAccessFile(file, "rw").use { it.setLength(valid.toLong()) }
            val stream = FileOutputStream(file, true)
            out = stream
            logBytes = valid.toLong()
            return stream
        } catch (error: IOException) {
            throw OneNativeError("E_STORAGE_OPEN", "Storage: ${error.message}")
        }
    }

    private fun replay(data: ByteArray): Int {
        var offset = 0
        var valid = 0
        fun field(): String? {
            if (offset + 4 > data.size) return null
            val length = (data[offset].toInt() and 0xff) or
                ((data[offset + 1].toInt() and 0xff) shl 8) or
                ((data[offset + 2].toInt() and 0xff) shl 16) or
                ((data[offset + 3].toInt() and 0xff) shl 24)
            offset += 4
            if (length < 0 || length > data.size - offset) return null
            val text = String(data, offset, length, Charsets.UTF_8)
            offset += length
            return text
        }
        while (offset < data.size) {
            val op = data[offset]
            offset += 1
            if (op != SET_OP && op != REMOVE_OP) break
            val key = field() ?: break
            if (op == SET_OP) {
                val value = field() ?: break
                val previous = entries.put(key, value)
                if (previous != null) liveBytes -= setSize(key, previous)
                liveBytes += setSize(key, value)
            } else {
                val previous = entries.remove(key)
                if (previous != null) liveBytes -= setSize(key, previous)
            }
            valid = offset
        }
        return valid
    }

    // writes the live entries to a temporary file and renames it over the log,
    // so a crash during compaction leaves one whole log or the other.
    private fun compactIfNeeded() {
        if (logBytes <= COMPACT_FLOOR || logBytes <= liveBytes * 2) return
        out?.close()
        out = null
        val temporary = File(file.parentFile, "storage.log.tmp")
        try {
            FileOutputStream(temporary).use { stream ->
                val buffered = BufferedOutputStream(stream, 64 * 1024)
                for ((key, value) in entries) {
                    encode(SET_OP, key.toByteArray(Charsets.UTF_8), value.toByteArray(Charsets.UTF_8))
                    buffered.write(record, 0, recordSize)
                }
                buffered.flush()
                stream.fd.sync()
            }
            if (!temporary.renameTo(file)) throw IOException("rename failed")
        } catch (error: IOException) {
            temporary.delete()
            throw OneNativeError("E_STORAGE_WRITE", "Storage: ${error.message}")
        }
        open()
    }
}
