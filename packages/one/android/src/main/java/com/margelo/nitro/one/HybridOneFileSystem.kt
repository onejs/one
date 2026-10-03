package com.margelo.nitro.one

import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.net.URI
import java.nio.file.AccessDeniedException
import java.nio.file.FileAlreadyExistsException
import java.nio.file.Files
import java.nio.file.NoSuchFileException
import java.nio.file.StandardCopyOption
import java.util.Base64
import java.util.concurrent.Executors

class HybridOneFileSystem : HybridOneFileSystemSpec() {
    private val context = requireNotNull(NitroModules.applicationContext)
    private val queue = Executors.newSingleThreadExecutor()
    private val documents = File(context.filesDir, "Documents").apply { mkdirs() }
    private val temporary = File(context.cacheDir, "tmp").apply { mkdirs() }

    override fun getDirectories() = FileDirectories(
        directoryURI(documents), directoryURI(context.cacheDir),
        directoryURI(context.filesDir), directoryURI(temporary))

    override fun getInfo(uri: String): Promise<FileInfo> = query("getInfo") {
        val file = file(uri)
        val exists = Files.exists(file.toPath())
        FileInfo(file.toURI().toString(), exists, exists && file.isDirectory,
            if (exists) file.length().toDouble() else null,
            if (exists) file.lastModified().toDouble() else null)
    }

    override fun readDirectory(uri: String): Promise<Array<FileEntry>> = query("readDirectory") {
        Files.newDirectoryStream(file(uri).toPath()).use { entries ->
            entries.map { FileEntry(it.fileName.toString(), it.toUri().toString(), Files.isDirectory(it)) }
                .sortedBy { it.name }.toTypedArray()
        }
    }

    override fun makeDirectory(uri: String, intermediates: Boolean): Promise<Unit> = query("makeDirectory") {
        val path = file(uri).toPath()
        if (intermediates) Files.createDirectories(path) else Files.createDirectory(path)
        Unit
    }

    override fun writeFile(uri: String, contents: String, encoding: FileEncoding): Promise<Unit> = query("writeFile") {
        val path = file(uri).toPath()
        val bytes = when (encoding) {
            FileEncoding.UTF8 -> contents.toByteArray(Charsets.UTF_8)
            FileEncoding.BASE64 -> try { Base64.getDecoder().decode(contents) }
                catch (error: IllegalArgumentException) { throw OneNativeError("E_FILE_ENCODING", "FileSystem.writeFile: invalid base64 contents") }
        }
        val staging = Files.createTempFile(path.parent, ".one-write-", null)
        try {
            Files.write(staging, bytes)
            Files.move(staging, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        } finally { Files.deleteIfExists(staging) }
        Unit
    }

    override fun copy(fromUri: String, toUri: String): Promise<Unit> = query("copy") {
        copyTree(file(fromUri), file(toUri))
    }

    override fun move(fromUri: String, toUri: String): Promise<Unit> = query("move") {
        Files.move(mutableFile(fromUri).toPath(), file(toUri).toPath())
        Unit
    }

    override fun remove(uri: String): Promise<Unit> = query("delete") {
        val path = mutableFile(uri).toPath()
        // walking without FOLLOW_LINKS deletes the link itself, never its target.
        Files.walk(path).use { paths ->
            paths.sorted(Comparator.reverseOrder()).forEach { Files.delete(it) }
        }
    }

    private fun copyTree(source: File, destination: File) {
        Files.walk(source.toPath()).use { paths ->
            paths.forEach { path ->
                Files.copy(path, destination.toPath().resolve(source.toPath().relativize(path)))
            }
        }
    }

    private fun file(value: String): File {
        try {
            val uri = URI(value)
            require(uri.scheme == "file" && uri.path.startsWith("/") &&
                (uri.host == null || uri.host.isEmpty() || uri.host == "localhost") &&
                uri.query == null && uri.fragment == null)
            return File(uri.path).toPath().normalize().toFile()
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

    private fun directoryURI(file: File) = file.toURI().toString().trimEnd('/') + "/"

    private fun <T> query(verb: String, work: () -> T): Promise<T> {
        val promise = Promise<T>()
        queue.execute {
            try { promise.resolve(work()) }
            catch (error: Exception) {
                val code = when (error) {
                    is NoSuchFileException -> "E_FILE_NOT_FOUND"
                    is FileAlreadyExistsException -> "E_FILE_EXISTS"
                    is AccessDeniedException, is SecurityException -> "E_FILE_PERMISSION"
                    else -> "E_FILE_FAILED"
                }
                promise.reject(if (error is OneNativeError) error else OneNativeError(code, "FileSystem.$verb: ${error.message}"))
            }
        }
        return promise
    }
}
