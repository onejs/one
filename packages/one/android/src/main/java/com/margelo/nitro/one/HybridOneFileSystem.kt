package com.margelo.nitro.one

import android.net.Uri
import android.os.Build
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import android.util.Base64
import android.webkit.MimeTypeMap
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.RandomAccessFile
import java.net.URI
import java.nio.charset.CodingErrorAction
import java.nio.file.Files
import java.nio.file.attribute.BasicFileAttributes
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

class HybridOneFileSystem : HybridOneFileSystemSpec() {
    private val context = requireNotNull(NitroModules.applicationContext)
    private val queue = Executors.newSingleThreadExecutor()
    private val documents = File(context.filesDir, "Documents").apply { mkdirs() }
    private val temporary = File(context.cacheDir, "tmp").apply { mkdirs() }
    private val handles = ConcurrentHashMap<Int, RandomAccessFile>()
    private val assetHandles = ConcurrentHashMap<Int, AssetHandle>()
    private val nextHandle = AtomicInteger(1)
    private val hexDigits = "0123456789ABCDEF"

    private class AssetHandle(var offset: Long, val bytes: ByteArray)

    override fun getDirectories() = FileDirectories(
        directoryURI(documents), directoryURI(context.cacheDir),
        directoryURI(context.filesDir), directoryURI(temporary))

    override fun getInfo(uri: String): Promise<FileInfo> = query("getInfo") {
        val file = file(uri)
        val stat = try { Os.stat(file.path) } catch (error: ErrnoException) {
            if (error.errno != OsConstants.ENOENT && error.errno != OsConstants.ENOTDIR) throw error
            null
        }
        FileInfo(Uri.fromFile(file).toString(), stat != null,
            stat != null && OsConstants.S_ISDIR(stat.st_mode),
            stat?.st_size?.toDouble(), if (stat != null) file.lastModified().toDouble() else null)
    }

    override fun readDirectory(uri: String): Promise<Array<FileEntry>> = query("readDirectory") {
        children(file(uri)).map { FileEntry(it.name, Uri.fromFile(it).toString(), it.isDirectory) }
            .sortedBy { it.name }.toTypedArray()
    }

    override fun makeDirectory(uri: String, intermediates: Boolean): Promise<Unit> = query("makeDirectory") {
        makeDirectory(file(uri), intermediates)
    }

    override fun writeFile(uri: String, contents: String, encoding: FileEncoding): Promise<Unit> = query("writeFile") {
        val target = file(uri)
        val bytes = when (encoding) {
            FileEncoding.UTF8 -> contents.toByteArray(Charsets.UTF_8)
            FileEncoding.BASE64 -> {
                if (contents.length % 4 != 0 || !contents.matches(Regex("[A-Za-z0-9+/]*={0,2}"))) {
                    throw OneNativeError("E_FILE_ENCODING", "FileSystem.writeFile: invalid base64 contents")
                }
                try { Base64.decode(contents, Base64.NO_WRAP) }
                catch (error: IllegalArgumentException) {
                    throw OneNativeError("E_FILE_ENCODING", "FileSystem.writeFile: invalid base64 contents")
                }
            }
        }
        writeAtomically(target, bytes)
    }

    override fun copy(fromUri: String, toUri: String): Promise<Unit> = query("copy") {
        val source = file(fromUri)
        val destination = file(toUri)
        if (source.isDirectory && destination.canonicalPath.startsWith(source.canonicalPath + "/")) {
            throw OneNativeError("E_FILE_FAILED", "FileSystem.copy: a directory cannot contain its copy")
        }
        copyTree(source, destination)
    }

    override fun move(fromUri: String, toUri: String): Promise<Unit> = query("move") {
        val source = mutableFile(fromUri)
        val destination = file(toUri)
        ensureMissing(destination)
        Os.rename(source.path, destination.path)
    }

    override fun remove(uri: String): Promise<Unit> = query("delete") {
        removeTree(mutableFile(uri))
    }

    // File, Directory, Paths, FileHandle backing, mirroring expo-file-system.

    override fun getBundleDirectory(): String = sync("getBundleDirectory") { "asset://" }

    override fun getDiskSpace(): DiskSpace = sync("getDiskSpace") {
        DiskSpace(context.filesDir.freeSpace.toDouble(), context.filesDir.totalSpace.toDouble())
    }

    override fun pathInfo(uri: String): PathStat = sync("pathInfo") {
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            val isDirectory = isAssetDirectory(path)
            val exists = isDirectory || isAssetFile(path)
            return@sync PathStat(exists, if (exists) isDirectory else null)
        }
        val file = file(uri)
        if (!file.canRead()) return@sync PathStat(false, null)
        val stat = try { Os.stat(file.path) } catch (error: ErrnoException) {
            if (error.errno != OsConstants.ENOENT && error.errno != OsConstants.ENOTDIR) throw error
            null
        }
        PathStat(stat != null, if (stat != null) OsConstants.S_ISDIR(stat.st_mode) else null)
    }

    override fun readText(uri: String): String = sync("readText") {
        if (isAssetUri(uri)) return@sync strictText(assetFileBytes(uri))
        readStrictText(contentFile(uri))
    }

    override fun readTextAsync(uri: String): Promise<String> = query("readText") {
        if (isAssetUri(uri)) return@query strictText(assetFileBytes(uri))
        readStrictText(contentFile(uri))
    }

    override fun readData(uri: String): ArrayBuffer = sync("readData") {
        if (isAssetUri(uri)) return@sync ArrayBuffer.copy(assetFileBytes(uri))
        ArrayBuffer.copy(contentFile(uri).readBytes())
    }

    override fun readDataAsync(uri: String): Promise<ArrayBuffer> = query("readData") {
        if (isAssetUri(uri)) return@query ArrayBuffer.copy(assetFileBytes(uri))
        ArrayBuffer.copy(contentFile(uri).readBytes())
    }

    override fun readBase64(uri: String): String = sync("readBase64") {
        if (isAssetUri(uri)) return@sync Base64.encodeToString(assetFileBytes(uri), Base64.NO_WRAP)
        Base64.encodeToString(contentFile(uri).readBytes(), Base64.NO_WRAP)
    }

    override fun readBase64Async(uri: String): Promise<String> = query("readBase64") {
        if (isAssetUri(uri)) return@query Base64.encodeToString(assetFileBytes(uri), Base64.NO_WRAP)
        Base64.encodeToString(contentFile(uri).readBytes(), Base64.NO_WRAP)
    }

    override fun writeText(uri: String, contents: String, encoding: FileEncoding, append: Boolean) {
        sync("writeText") {
            if (isAssetUri(uri)) {
                assetPath(uri)
                readOnly()
            }
            writeBytes(contentFile(uri), decoded(contents, encoding), append)
        }
    }

    override fun writeTextAsync(
        uri: String, contents: String, encoding: FileEncoding, append: Boolean
    ): Promise<Unit> = query("writeText") {
        if (isAssetUri(uri)) {
            assetPath(uri)
            readOnly()
        }
        writeBytes(contentFile(uri), decoded(contents, encoding), append)
    }

    override fun writeData(uri: String, bytes: ArrayBuffer, append: Boolean) {
        sync("writeData") {
            if (isAssetUri(uri)) {
                assetPath(uri)
                readOnly()
            }
            writeBytes(contentFile(uri), bytes.toByteArray(), append)
        }
    }

    override fun writeDataAsync(uri: String, bytes: ArrayBuffer, append: Boolean): Promise<Unit> {
        val data = bytes.toByteArray()
        return query("writeData") {
            if (isAssetUri(uri)) {
                assetPath(uri)
                readOnly()
            }
            writeBytes(contentFile(uri), data, append)
        }
    }

    override fun fileDigest(uri: String, algorithm: String): Promise<String> = query("fileDigest") {
        val name = when (algorithm) {
            "MD5" -> "MD5"
            "SHA-1" -> "SHA-1"
            "SHA-256" -> "SHA-256"
            "SHA-384" -> "SHA-384"
            "SHA-512" -> "SHA-512"
            else -> throw OneNativeError("E_FILE_FAILED", "FileSystem.fileDigest: unknown digest algorithm")
        }
        val digest = MessageDigest.getInstance(name)
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            if (isAssetDirectory(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem: expected a file")
            try {
                context.assets.open(path).use { input -> feedDigest(digest, input) }
            } catch (error: OneNativeError) {
                throw error
            } catch (error: Exception) {
                throw ErrnoException("digest", OsConstants.ENOENT)
            }
        } else {
            FileInputStream(contentFile(uri)).use { input -> feedDigest(digest, input) }
        }
        digest.digest().joinToString("") { "%02x".format(it) }
    }

    override fun createFileEntry(uri: String, intermediates: Boolean, overwrite: Boolean) {
        sync("createFileEntry") {
            if (isAssetUri(uri)) {
                assetPath(uri)
                readOnly()
            }
            val target = file(uri)
            if (target.exists()) {
                if (!overwrite) throw ErrnoException("create", OsConstants.EEXIST)
                removeTree(mutableFile(uri))
            }
            val parent = target.parentFile
            if (parent?.isDirectory != true) {
                if (!intermediates) throw ErrnoException("create", OsConstants.ENOENT)
                parent?.mkdirs()
            }
            if (!target.createNewFile()) throw ErrnoException("create", OsConstants.EEXIST)
        }
    }

    override fun createDirectoryEntry(
        uri: String, intermediates: Boolean, overwrite: Boolean, idempotent: Boolean
    ) {
        sync("createDirectoryEntry") {
            if (isAssetUri(uri)) {
                assetPath(uri)
                readOnly()
            }
            val target = file(uri)
            if (target.exists()) {
                if (target.isDirectory) {
                    if (idempotent) return@sync
                    if (!overwrite) throw ErrnoException("create", OsConstants.EEXIST)
                } else if (!overwrite) throw ErrnoException("create", OsConstants.EEXIST)
                removeTree(mutableFile(uri))
            }
            if (intermediates) {
                if (!target.mkdirs() && !target.isDirectory) throw ErrnoException("create", OsConstants.EACCES)
            } else {
                makeDirectory(target, false)
            }
        }
    }

    override fun createFileInDirectory(dirUri: String, name: String): String = sync("createFileInDirectory") {
        if (isAssetUri(dirUri)) {
            val path = assetPath(dirUri)
            if (!isAssetDirectory(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem.createFileInDirectory: expected a directory")
            entryName(name)
            readOnly()
        }
        val parent = file(dirUri)
        if (!parent.isDirectory) throw OneNativeError("E_FILE_FAILED", "FileSystem.createFileInDirectory: expected a directory")
        val child = File(parent, entryName(name))
        if (!child.createNewFile()) throw ErrnoException("create", OsConstants.EEXIST)
        Uri.fromFile(child).toString()
    }

    override fun createSubdirectory(dirUri: String, name: String): String = sync("createSubdirectory") {
        if (isAssetUri(dirUri)) {
            val path = assetPath(dirUri)
            if (!isAssetDirectory(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem.createSubdirectory: expected a directory")
            entryName(name)
            readOnly()
        }
        val parent = file(dirUri)
        if (!parent.isDirectory) throw OneNativeError("E_FILE_FAILED", "FileSystem.createSubdirectory: expected a directory")
        makeDirectory(File(parent, entryName(name)), false)
        Uri.fromFile(File(parent, entryName(name))).toString()
    }

    override fun deleteEntry(uri: String) {
        sync("deleteEntry") {
            if (isAssetUri(uri)) {
                val path = assetPath(uri)
                if (!isAssetDirectory(path) && !isAssetFile(path)) throw ErrnoException("delete", OsConstants.ENOENT)
                readOnly()
            }
            removeTree(mutableFile(uri))
        }
    }

    override fun renameEntry(uri: String, newName: String): String = sync("renameEntry") {
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            entryName(newName)
            if (!isAssetDirectory(path) && !isAssetFile(path)) throw ErrnoException("rename", OsConstants.ENOENT)
            readOnly()
        }
        val source = mutableFile(uri)
        val destination = File(source.parentFile, entryName(newName))
        ensureMissing(destination)
        Os.rename(source.path, destination.path)
        Uri.fromFile(destination).toString()
    }

    override fun copyEntry(fromUri: String, toUri: String, overwrite: Boolean) {
        sync("copyEntry") { relocate(copy = true, fromUri, toUri, overwrite) }
    }

    override fun copyEntryAsync(fromUri: String, toUri: String, overwrite: Boolean): Promise<Unit> =
        query("copyEntry") { relocate(copy = true, fromUri, toUri, overwrite) }

    override fun moveEntry(fromUri: String, toUri: String, overwrite: Boolean) {
        sync("moveEntry") { relocate(copy = false, fromUri, toUri, overwrite) }
    }

    override fun moveEntryAsync(fromUri: String, toUri: String, overwrite: Boolean): Promise<Unit> =
        query("moveEntry") { relocate(copy = false, fromUri, toUri, overwrite) }

    override fun listEntries(uri: String): Array<ListedEntry> = sync("listEntries") {
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            if (!isAssetDirectory(path)) throw ErrnoException("list", OsConstants.ENOTDIR)
            val names = try {
                context.assets.list(path) ?: emptyArray()
            } catch (error: Exception) {
                throw ErrnoException("list", OsConstants.ENOENT)
            }
            return@sync names.sorted().map {
                val child = if (path.isEmpty()) it else "$path/$it"
                ListedEntry(it, assetChildUri(child), isAssetDirectory(child))
            }.toTypedArray()
        }
        children(file(uri)).map { ListedEntry(it.name, Uri.fromFile(it).toString(), it.isDirectory) }
            .sortedBy { it.name }.toTypedArray()
    }

    override fun fileDetails(uri: String): DetailedFileInfo = sync("fileDetails") {
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            if (isAssetDirectory(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem.fileDetails: expected a file")
            if (!isAssetFile(path)) return@sync DetailedFileInfo(false, 0.0, null, null, "")
            return@sync DetailedFileInfo(true, assetLength(path).toDouble(), null, null,
                mimeTypeByName(path.substringAfterLast('/')))
        }
        val target = file(uri)
        if (!target.exists()) return@sync DetailedFileInfo(false, 0.0, null, null, "")
        if (!target.isFile) throw OneNativeError("E_FILE_FAILED", "FileSystem.fileDetails: expected a file")
        DetailedFileInfo(true, target.length().toDouble(), target.lastModified().toDouble(),
            creationTime(target), mimeType(target))
    }

    override fun directoryDetails(uri: String): DetailedDirectoryInfo = sync("directoryDetails") {
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            if (!isAssetDirectory(path)) {
                if (isAssetFile(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem.directoryDetails: expected a directory")
                return@sync DetailedDirectoryInfo(false, null, null, null, null)
            }
            val files = try {
                (context.assets.list(path) ?: emptyArray()).sortedArray()
            } catch (error: Exception) {
                emptyArray()
            }
            return@sync DetailedDirectoryInfo(true, assetDirectorySize(path).toDouble(), null, null, files)
        }
        val target = file(uri)
        if (!target.exists()) return@sync DetailedDirectoryInfo(false, null, null, null, null)
        if (!target.isDirectory) throw OneNativeError("E_FILE_FAILED", "FileSystem.directoryDetails: expected a directory")
        DetailedDirectoryInfo(true, directorySize(target).toDouble(), target.lastModified().toDouble(),
            creationTime(target), (target.list() ?: emptyArray()).sortedArray())
    }

    override fun openFile(uri: String, mode: String): Double = sync("openFile") {
        if (isAssetUri(uri)) {
            val path = assetPath(uri)
            when (mode) {
                "r", "rw", "w", "wa", "wt" -> Unit
                else -> throw OneNativeError("E_FILE_FAILED", "FileSystem.openFile: invalid file mode")
            }
            if (mode != "r") readOnly()
            if (isAssetDirectory(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem.openFile: expected a file")
            val bytes = try {
                context.assets.open(path).use { it.readBytes() }
            } catch (error: Exception) {
                throw ErrnoException("open", OsConstants.ENOENT)
            }
            val id = nextHandle.getAndIncrement()
            assetHandles[id] = AssetHandle(0, bytes)
            return@sync id.toDouble()
        }
        val target = file(uri)
        val access = when (mode) {
            "r", "rw", "w", "wa", "wt" -> if (mode == "r") "r" else "rw"
            else -> throw OneNativeError("E_FILE_FAILED", "FileSystem.openFile: invalid file mode")
        }
        if (target.exists() && !target.isFile) {
            throw OneNativeError("E_FILE_FAILED", "FileSystem.openFile: expected a file")
        }
        if (!target.exists()) {
            if (mode == "r" || mode == "rw" || target.parentFile?.isDirectory != true) {
                throw ErrnoException("open", OsConstants.ENOENT)
            }
            target.createNewFile()
        }
        val accessFile = RandomAccessFile(target, access)
        try {
            when (mode) {
                "wa" -> accessFile.seek(accessFile.length())
                "wt" -> accessFile.setLength(0)
                else -> accessFile.seek(0)
            }
        } catch (e: Exception) {
            try {
                accessFile.close()
            } catch (ignored: Exception) {
            }
            throw e
        }
        val id = nextHandle.getAndIncrement()
        handles[id] = accessFile
        id.toDouble()
    }

    override fun closeFile(handle: Double) {
        sync("closeFile") {
            if (assetHandles.remove(handle.toInt()) != null) return@sync
            (handles.remove(handle.toInt())
                ?: throw OneNativeError("E_FILE_FAILED", "FileSystem.closeFile: unknown file handle")).close()
        }
    }

    override fun readHandle(handle: Double, length: Double): ArrayBuffer = sync("readHandle") {
        if (length < 0) throw OneNativeError("E_FILE_FAILED", "FileSystem.readHandle: invalid byte range")
        assetHandles[handle.toInt()]?.let { asset ->
            synchronized(asset) { return@sync ArrayBuffer.copy(readAssetHandle(asset, length)) }
        }
        val accessFile = openHandle(handle.toInt())
        synchronized(accessFile) {
            val buffer = ByteArray(length.toInt())
            val read = accessFile.read(buffer)
            ArrayBuffer.copy(if (read > 0) buffer.copyOf(read) else ByteArray(0))
        }
    }

    override fun readHandleAsync(handle: Double, length: Double): Promise<ArrayBuffer> = query("readHandle") {
        if (length < 0) throw OneNativeError("E_FILE_FAILED", "FileSystem.readHandle: invalid byte range")
        assetHandles[handle.toInt()]?.let { asset ->
            synchronized(asset) { return@query ArrayBuffer.copy(readAssetHandle(asset, length)) }
        }
        val accessFile = openHandle(handle.toInt())
        synchronized(accessFile) {
            val buffer = ByteArray(length.toInt())
            val read = accessFile.read(buffer)
            ArrayBuffer.copy(if (read > 0) buffer.copyOf(read) else ByteArray(0))
        }
    }

    override fun writeHandle(handle: Double, bytes: ArrayBuffer) {
        sync("writeHandle") {
            if (assetHandles.containsKey(handle.toInt())) readOnly()
            writeHandleData(openHandle(handle.toInt()), bytes.toByteArray())
        }
    }

    override fun writeHandleAsync(handle: Double, bytes: ArrayBuffer): Promise<Unit> {
        val data = bytes.toByteArray()
        return query("writeHandle") {
            if (assetHandles.containsKey(handle.toInt())) readOnly()
            writeHandleData(openHandle(handle.toInt()), data)
        }
    }

    override fun getHandleOffset(handle: Double): Double = sync("getHandleOffset") {
        assetHandles[handle.toInt()]?.let { asset ->
            synchronized(asset) { return@sync asset.offset.toDouble() }
        }
        val accessFile = openHandle(handle.toInt())
        synchronized(accessFile) { accessFile.filePointer.toDouble() }
    }

    override fun setHandleOffset(handle: Double, offset: Double) {
        sync("setHandleOffset") {
            if (offset < 0) throw OneNativeError("E_FILE_FAILED", "FileSystem.setHandleOffset: invalid byte range")
            assetHandles[handle.toInt()]?.let { asset ->
                synchronized(asset) { asset.offset = offset.toLong() }
                return@sync
            }
            val accessFile = openHandle(handle.toInt())
            synchronized(accessFile) { accessFile.seek(offset.toLong()) }
        }
    }

    override fun getHandleSize(handle: Double): Double = sync("getHandleSize") {
        assetHandles[handle.toInt()]?.let { return@sync it.bytes.size.toDouble() }
        val accessFile = openHandle(handle.toInt())
        synchronized(accessFile) { accessFile.length().toDouble() }
    }

    private fun makeDirectory(directory: File, intermediates: Boolean) {
        if (intermediates && directory.isDirectory) return
        if (intermediates) directory.parentFile?.let { makeDirectory(it, true) }
        Os.mkdir(directory.path, OsConstants.S_IRWXU)
    }

    private fun children(directory: File): Array<File> {
        val stat = Os.stat(directory.path)
        if (!OsConstants.S_ISDIR(stat.st_mode)) throw ErrnoException("list", OsConstants.ENOTDIR)
        return directory.listFiles() ?: throw ErrnoException("list", OsConstants.EACCES)
    }

    private fun ensureMissing(destination: File) {
        try { Os.lstat(destination.path) } catch (error: ErrnoException) {
            if (error.errno == OsConstants.ENOENT) return
            throw error
        }
        throw ErrnoException("destination", OsConstants.EEXIST)
    }

    private fun copyTree(source: File, destination: File) {
        val stat = Os.lstat(source.path)
        when {
            OsConstants.S_ISLNK(stat.st_mode) -> Os.symlink(Os.readlink(source.path), destination.path)
            OsConstants.S_ISDIR(stat.st_mode) -> {
                Os.mkdir(destination.path, OsConstants.S_IRWXU)
                children(source).forEach { copyTree(it, File(destination, it.name)) }
            }
            else -> FileInputStream(source).use { input ->
                val descriptor = Os.open(destination.path,
                    OsConstants.O_WRONLY or OsConstants.O_CREAT or OsConstants.O_EXCL, OsConstants.S_IRUSR or OsConstants.S_IWUSR)
                try { FileOutputStream(descriptor).use { output -> input.copyTo(output) } }
                finally { Os.close(descriptor) }
            }
        }
    }

    private fun removeTree(file: File) {
        val stat = Os.lstat(file.path)
        if (OsConstants.S_ISDIR(stat.st_mode)) {
            children(file).forEach { removeTree(it) }
        }
        Os.remove(file.path)
    }

    private fun file(value: String): File {
        try {
            val uri = URI(value)
            require(uri.scheme == "file" && uri.path.startsWith("/") &&
                (uri.host == null || uri.host.isEmpty() || uri.host == "localhost") &&
                uri.query == null && uri.fragment == null)
            return File(URI(null, null, uri.path, null).normalize().path)
        } catch (error: Exception) {
            throw OneNativeError("E_FILE_URI", "FileSystem: expected an absolute file URI")
        }
    }

    private fun mutableFile(uri: String): File {
        val target = file(uri)
        val roots = listOf(context.dataDir, context.filesDir, documents, context.cacheDir, temporary, context.noBackupFilesDir)
        if (roots.any { it.canonicalFile == target.canonicalFile }) {
            throw OneNativeError("E_FILE_PERMISSION", "FileSystem: app root directories are protected")
        }
        return target
    }

    private fun directoryURI(file: File) = Uri.fromFile(file).toString().trimEnd('/') + "/"

    private fun isAssetUri(value: String): Boolean {
        return try { URI(value).scheme == "asset" } catch (error: Exception) { false }
    }

    private fun assetPath(value: String): String {
        try {
            val uri = URI(value)
            // opaque ('asset:relative') has no path; raw authority (not host, which parses
            // null for 'asset://evil:bad/...') must be empty; the multi-arg ctor below
            // re-quotes '%' so getPath decodes exactly once.
            require(!uri.isOpaque &&
                uri.scheme == "asset" &&
                (uri.authority == null || uri.authority.isEmpty()) &&
                uri.query == null && uri.fragment == null &&
                (uri.path == null || uri.path.isEmpty() || uri.path.startsWith("/")))
            if (uri.path == null || uri.path.isEmpty()) return ""
            return (URI(null, null, uri.path, null).normalize().path ?: "").trim('/')
        } catch (error: OneNativeError) {
            throw error
        } catch (error: Exception) {
            throw OneNativeError("E_FILE_URI", "FileSystem: expected an absolute file URI")
        }
    }

    private fun assetChildUri(child: String): String =
        "asset:///" + child.split('/').joinToString("/") { encodeAssetSegment(it) }

    // rfc 3986 unreserved only; every other byte (including '%' and non-ascii)
    // becomes %XX so listed names survive uri re-entry and decode to the exact asset path.
    private fun encodeAssetSegment(segment: String): String {
        val out = StringBuilder(segment.length)
        segment.toByteArray(Charsets.UTF_8).forEach { byte ->
            val code = byte.toInt() and 0xFF
            if (code in '0'.code..'9'.code || code in 'A'.code..'Z'.code ||
                code in 'a'.code..'z'.code || code == '-'.code || code == '_'.code ||
                code == '.'.code || code == '~'.code
            ) {
                out.append(code.toChar())
            } else {
                out.append('%').append(hexDigits[code shr 4]).append(hexDigits[code and 0x0F])
            }
        }
        return out.toString()
    }

    private fun readOnly(): Nothing {
        throw OneNativeError("E_FILE_PERMISSION", "FileSystem: assets are read-only")
    }

    private fun isAssetDirectory(path: String): Boolean {
        if (path.isEmpty()) return true
        return try { context.assets.list(path)?.isNotEmpty() == true } catch (error: Exception) { false }
    }

    private fun isAssetFile(path: String): Boolean {
        if (path.isEmpty()) return false
        return try { context.assets.open(path).use { true } } catch (error: Exception) { false }
    }

    private fun assetBytes(path: String): ByteArray {
        try {
            context.assets.open(path).use { return it.readBytes() }
        } catch (error: Exception) {
            throw ErrnoException("read", OsConstants.ENOENT)
        }
    }

    private fun assetFileBytes(uri: String): ByteArray {
        val path = assetPath(uri)
        if (isAssetDirectory(path)) throw OneNativeError("E_FILE_FAILED", "FileSystem: expected a file")
        return assetBytes(path)
    }

    private fun assetLength(path: String): Long {
        try {
            context.assets.openFd(path).use { descriptor ->
                if (descriptor.length >= 0) return descriptor.length
            }
        } catch (error: Exception) { }
        try {
            context.assets.open(path).use { input ->
                var size = 0L
                val buffer = ByteArray(8192)
                while (true) {
                    val read = input.read(buffer)
                    if (read < 0) break
                    size += read
                }
                return size
            }
        } catch (error: Exception) { }
        return 0
    }

    private fun assetDirectorySize(path: String): Long {
        var total = 0L
        val names = try { context.assets.list(path) ?: emptyArray() } catch (error: Exception) { return 0 }
        names.forEach {
            val child = if (path.isEmpty()) it else "$path/$it"
            if (isAssetDirectory(child)) total += assetDirectorySize(child)
            else if (isAssetFile(child)) total += assetLength(child)
        }
        return total
    }

    private fun copyAssetToFile(assetPath: String, destination: File) {
        if (isAssetDirectory(assetPath)) {
            Os.mkdir(destination.path, OsConstants.S_IRWXU)
            val names = try { context.assets.list(assetPath) ?: emptyArray() } catch (error: Exception) {
                throw ErrnoException("copy", OsConstants.ENOENT)
            }
            names.forEach { copyAssetToFile(if (assetPath.isEmpty()) it else "$assetPath/$it", File(destination, it)) }
            return
        }
        val input = try { context.assets.open(assetPath) } catch (error: Exception) {
            throw ErrnoException("copy", OsConstants.ENOENT)
        }
        input.use { source ->
            val descriptor = Os.open(destination.path,
                OsConstants.O_WRONLY or OsConstants.O_CREAT or OsConstants.O_EXCL, OsConstants.S_IRUSR or OsConstants.S_IWUSR)
            try { FileOutputStream(descriptor).use { output -> source.copyTo(output) } }
            finally { Os.close(descriptor) }
        }
    }

    private fun readAssetHandle(asset: AssetHandle, length: Double): ByteArray {
        val size = asset.bytes.size.toLong()
        if (asset.offset < 0) asset.offset = 0
        if (asset.offset >= size) return ByteArray(0)
        val start = asset.offset.toInt()
        val requested = length.toLong().coerceAtLeast(0).coerceAtMost(size - asset.offset).toInt()
        val slice = asset.bytes.copyOfRange(start, start + requested)
        asset.offset = (start + requested).toLong()
        return slice
    }

    private fun feedDigest(digest: MessageDigest, input: InputStream) {
        val chunk = ByteArray(65536)
        while (true) {
            val read = input.read(chunk)
            if (read < 0) break
            digest.update(chunk, 0, read)
        }
    }

    private fun readStrictText(target: File): String = strictText(target.readBytes())

    private fun strictText(bytes: ByteArray): String {
        val decoder = Charsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
        try {
            return decoder.decode(java.nio.ByteBuffer.wrap(bytes)).toString()
        } catch (error: Exception) {
            throw OneNativeError("E_FILE_ENCODING", "FileSystem: contents are not valid utf8")
        }
    }

    private fun decoded(contents: String, encoding: FileEncoding): ByteArray = when (encoding) {
        FileEncoding.UTF8 -> contents.toByteArray(Charsets.UTF_8)
        FileEncoding.BASE64 -> {
            if (contents.length % 4 != 0 || !contents.matches(Regex("[A-Za-z0-9+/]*={0,2}"))) {
                throw OneNativeError("E_FILE_ENCODING", "FileSystem: invalid base64 contents")
            }
            try { Base64.decode(contents, Base64.NO_WRAP) }
            catch (error: IllegalArgumentException) {
                throw OneNativeError("E_FILE_ENCODING", "FileSystem: invalid base64 contents")
            }
        }
    }

    private fun writeBytes(target: File, data: ByteArray, append: Boolean) {
        if (append && target.exists()) {
            FileOutputStream(target, true).use { it.write(data) }
            return
        }
        writeAtomically(target, data)
    }

    private fun entryName(name: String): String {
        if (name.isEmpty() || name.contains("/") || name == "." || name == "..") {
            throw OneNativeError("E_FILE_FAILED", "FileSystem: invalid file name")
        }
        return name
    }

    private fun relocate(copy: Boolean, fromUri: String, toUri: String, overwrite: Boolean) {
        val fromAsset = isAssetUri(fromUri)
        val toAsset = isAssetUri(toUri)
        if (fromAsset || toAsset) {
            val fromPath = if (fromAsset) assetPath(fromUri) else file(fromUri).let { null }
            val toFile = if (!toAsset) file(toUri) else assetPath(toUri).let { null }
            if (copy && fromAsset && !toAsset) {
                val destination = toFile!!
                if (destination.exists()) {
                    if (!overwrite) throw ErrnoException("destination", OsConstants.EEXIST)
                    mutableFile(toUri)
                    removeTree(destination)
                }
                copyAssetToFile(fromPath!!, destination)
                return
            }
            readOnly()
        }
        val source = if (copy) file(fromUri) else mutableFile(fromUri)
        val destination = file(toUri)
        if (source.canonicalFile == destination.canonicalFile) {
            throw OneNativeError("E_FILE_FAILED", "FileSystem: a file cannot contain its copy")
        }
        if (source.isDirectory && destination.canonicalPath.startsWith(source.canonicalPath + "/")) {
            throw OneNativeError("E_FILE_FAILED", "FileSystem: a directory cannot contain its copy")
        }
        if (destination.exists()) {
            if (!overwrite) throw ErrnoException("destination", OsConstants.EEXIST)
            mutableFile(toUri)
            removeTree(destination)
        }
        if (copy) copyTree(source, destination) else Os.rename(source.path, destination.path)
    }

    private fun mimeType(target: File): String = mimeTypeByName(target.name)

    private fun mimeTypeByName(name: String): String {
        val dot = name.lastIndexOf('.')
        if (dot < 0 || dot == name.length - 1) return ""
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(name.substring(dot + 1).lowercase()) ?: ""
    }

    private fun creationTime(target: File): Double? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
        return try {
            Files.readAttributes(target.toPath(), BasicFileAttributes::class.java)
                .creationTime().toMillis().toDouble()
        } catch (error: Exception) { null }
    }

    private fun directorySize(directory: File): Long {
        var total = 0L
        children(directory).forEach {
            total += if (it.isDirectory && !Files.isSymbolicLink(it.toPath())) directorySize(it)
            else if (it.isFile) it.length() else 0L
        }
        return total
    }

    private fun openHandle(id: Int): RandomAccessFile =
        handles[id] ?: throw OneNativeError("E_FILE_FAILED", "FileSystem: unknown file handle")

    private fun writeHandleData(accessFile: RandomAccessFile, data: ByteArray) {
        synchronized(accessFile) {
            // an offset past the end appends instead of zero-filling the gap.
            val position = accessFile.filePointer
            val end = accessFile.length()
            accessFile.seek(if (position < end) position else end)
            accessFile.write(data)
        }
    }

    private fun contentFile(uri: String): File {
        val target = file(uri)
        if (target.exists() && !target.isFile) {
            throw OneNativeError("E_FILE_FAILED", "FileSystem: expected a file")
        }
        return target
    }

    private fun failure(verb: String, error: Exception): OneNativeError {
        if (error is OneNativeError) return error
        val native = generateSequence<Throwable>(error) { it.cause }.filterIsInstance<ErrnoException>().firstOrNull()
        val code = when (native?.errno) {
            OsConstants.ENOENT, OsConstants.ENOTDIR -> "E_FILE_NOT_FOUND"
            OsConstants.EEXIST -> "E_FILE_EXISTS"
            OsConstants.EACCES, OsConstants.EPERM, OsConstants.EROFS -> "E_FILE_PERMISSION"
            else -> "E_FILE_FAILED"
        }
        // reads and opens surface platform file errors; map the common io cases.
        if (error is java.io.FileNotFoundException) {
            return OneNativeError("E_FILE_NOT_FOUND", "FileSystem.$verb: ${error.message}")
        }
        return OneNativeError(code, "FileSystem.$verb: ${error.message}")
    }

    private fun <T> sync(verb: String, work: () -> T): T {
        try {
            return work()
        } catch (error: OneNativeError) {
            throw error
        } catch (error: Exception) {
            throw failure(verb, error)
        }
    }

    private fun <T> query(verb: String, work: () -> T): Promise<T> {
        val promise = Promise<T>()
        queue.execute {
            try { promise.resolve(work()) }
            catch (error: Exception) { promise.reject(failure(verb, error)) }
        }
        return promise
    }
}
