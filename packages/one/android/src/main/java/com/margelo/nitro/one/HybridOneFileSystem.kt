package com.margelo.nitro.one

import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.URI
import android.util.Base64
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
        val stat = try { Os.stat(file.path) } catch (error: ErrnoException) {
            if (error.errno != OsConstants.ENOENT && error.errno != OsConstants.ENOTDIR) throw error
            null
        }
        FileInfo(file.toURI().toString(), stat != null,
            stat != null && OsConstants.S_ISDIR(stat.st_mode),
            stat?.st_size?.toDouble(), if (stat != null) file.lastModified().toDouble() else null)
    }

    override fun readDirectory(uri: String): Promise<Array<FileEntry>> = query("readDirectory") {
        children(file(uri)).map { FileEntry(it.name, it.toURI().toString(), it.isDirectory) }
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
        val staging = File.createTempFile(".one-write-", null, target.parentFile)
        try {
            FileOutputStream(staging).use { it.write(bytes) }
            Os.rename(staging.path, target.path)
        } finally { staging.delete() }
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

    private fun directoryURI(file: File) = file.toURI().toString().trimEnd('/') + "/"

    private fun <T> query(verb: String, work: () -> T): Promise<T> {
        val promise = Promise<T>()
        queue.execute {
            try { promise.resolve(work()) }
            catch (error: Exception) {
                val native = generateSequence<Throwable>(error) { it.cause }.filterIsInstance<ErrnoException>().firstOrNull()
                val code = when (native?.errno) {
                    OsConstants.ENOENT -> "E_FILE_NOT_FOUND"
                    OsConstants.EEXIST -> "E_FILE_EXISTS"
                    OsConstants.EACCES, OsConstants.EPERM, OsConstants.EROFS -> "E_FILE_PERMISSION"
                    else -> "E_FILE_FAILED"
                }
                promise.reject(if (error is OneNativeError) error else
                    OneNativeError(code, "FileSystem.$verb: ${error.message}"))
            }
        }
        return promise
    }
}
