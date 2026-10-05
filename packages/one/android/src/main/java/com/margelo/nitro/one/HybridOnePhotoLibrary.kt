package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.content.IntentSender
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

// photos over MediaStore. asset identifiers are content URI strings,
// stable while the row exists; album identifiers are
// "bucket:<bucket_id>". the eight collection/edit methods stay honestly
// unavailable at the native layer too (createAlbum rejects, the rest
// no-op), matching unavailable.ts. the limited picker snapshots visible
// ids before the API 34+ reshow and returns newly granted additions
// only. provider work runs on one worker; the picker, permission and
// consent slots are only taken or settled under the lock.
class HybridOnePhotoLibrary : HybridOnePhotoLibrarySpec(), ActivityEventListener, PermissionListener {
    private val lock = Any()
    private var pendingPermission: Promise<PhotoLibraryPermissionStatus>? = null
    private var pendingPermissionKind: String = "read"
    private var pendingPicker: Promise<Array<String>>? = null
    private var pendingPickerBefore: Set<String> = emptySet()
    private var pendingPickerRerequest: Boolean = false
    private var pendingConsent: Promise<Unit>? = null
    private var pendingConsentVerb: String = ""
    private var pendingConsentCheck: (() -> Boolean)? = null
    private val worker = Executors.newSingleThreadExecutor()

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("PhotoLibrary: the react context is not ready")

    init {
        NitroModules.applicationContext?.addActivityEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeActivityEventListener(this)
        val permission: Promise<PhotoLibraryPermissionStatus>?
        val picker: Promise<Array<String>>?
        val consent: Promise<Unit>?
        val verb: String
        synchronized(lock) {
            permission = pendingPermission
            picker = pendingPicker
            consent = pendingConsent
            verb = pendingConsentVerb
            pendingPermission = null
            pendingPicker = null
            pendingConsent = null
            pendingConsentCheck = null
        }
        permission?.reject(OneNativeError(E_PERMISSION, "PhotoLibrary.requestReadPermission: torn down mid-request"))
        picker?.reject(OneNativeError(E_BUSY, "PhotoLibrary.presentLimitedLibraryPicker: torn down mid-request"))
        consent?.reject(OneNativeError(E_BUSY, "PhotoLibrary.$verb: torn down mid-request"))
        worker.shutdownNow()
        super.dispose()
    }

    override fun getAddPermissionStatus(): PhotoLibraryPermissionStatus {
        if (!isAddDeclared() && !isReadDeclared()) return PhotoLibraryPermissionStatus.NOTDETERMINED
        if (Build.VERSION.SDK_INT >= 29) return PhotoLibraryPermissionStatus.AUTHORIZED
        return if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            PhotoLibraryPermissionStatus.AUTHORIZED
        } else if (wasAsked("add")) {
            PhotoLibraryPermissionStatus.DENIED
        } else {
            PhotoLibraryPermissionStatus.NOTDETERMINED
        }
    }

    override fun requestAddPermission(): Promise<PhotoLibraryPermissionStatus> {
        val promise = Promise<PhotoLibraryPermissionStatus>()
        if (!isAddDeclared()) {
            promise.reject(
                OneNativeError(E_MANIFEST, "PhotoLibrary.requestAddPermission: set native.app.photoLibrary.addOnly")
            )
            return promise
        }
        if (Build.VERSION.SDK_INT >= 29) {
            promise.resolve(PhotoLibraryPermissionStatus.AUTHORIZED)
            return promise
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_EXTERNAL_STORAGE) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve(PhotoLibraryPermissionStatus.AUTHORIZED)
            return promise
        }
        val activity = context.currentActivity
        val aware = activity as? PermissionAwareActivity
        if (activity == null || aware == null) {
            promise.reject(
                OneNativeError(E_UNAVAILABLE, "PhotoLibrary.requestAddPermission: found no activity to prompt from")
            )
            return promise
        }
        synchronized(lock) {
            if (pendingPermission != null || pendingPicker != null) {
                promise.reject(
                    OneNativeError(E_BUSY, "PhotoLibrary.requestAddPermission: another request is already in flight")
                )
                return promise
            }
            pendingPermission = promise
            pendingPermissionKind = "add"
        }
        markAsked("add")
        aware.requestPermissions(
            arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
            REQUEST_PERMISSION,
            this
        )
        return promise
    }

    override fun getReadPermissionStatus(): PhotoLibraryPermissionStatus = readStatus()

    override fun requestReadPermission(): Promise<PhotoLibraryPermissionStatus> {
        val promise = Promise<PhotoLibraryPermissionStatus>()
        if (!isReadDeclared()) {
            promise.reject(
                OneNativeError(E_MANIFEST, "PhotoLibrary.requestReadPermission: set native.app.photoLibrary.readWrite")
            )
            return promise
        }
        val current = readStatus()
        if (current == PhotoLibraryPermissionStatus.AUTHORIZED || current == PhotoLibraryPermissionStatus.LIMITED) {
            promise.resolve(current)
            return promise
        }
        val activity = context.currentActivity
        val aware = activity as? PermissionAwareActivity
        if (activity == null || aware == null) {
            promise.reject(
                OneNativeError(E_UNAVAILABLE, "PhotoLibrary.requestReadPermission: found no activity to prompt from")
            )
            return promise
        }
        synchronized(lock) {
            if (pendingPermission != null || pendingPicker != null) {
                promise.reject(
                    OneNativeError(E_BUSY, "PhotoLibrary.requestReadPermission: another request is already in flight")
                )
                return promise
            }
            pendingPermission = promise
            pendingPermissionKind = "read"
        }
        markAsked("read")
        aware.requestPermissions(readPermissions(), REQUEST_PERMISSION, this)
        return promise
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != REQUEST_PERMISSION) return false
        val chained = synchronized(lock) {
            val chained = pendingPickerRerequest
            pendingPickerRerequest = false
            chained
        }
        if (chained) {
            // the reshow's chained request: the dialog answered, so the
            // grant is whatever the user chose and the delta is final.
            settlePickerDiff()
            return true
        }
        val pending = synchronized(lock) {
            val pending = pendingPermission
            val kind = pendingPermissionKind
            pendingPermission = null
            Pair(pending, kind)
        }
        if (pending.first == null) return true
        if (pending.second == "add") {
            pending.first!!.resolve(getAddPermissionStatus())
        } else {
            pending.first!!.resolve(readStatus())
        }
        return true
    }

    private fun reshowPrefs(): android.content.SharedPreferences {
        return context.getSharedPreferences("one-native-photo-reshow", android.content.Context.MODE_PRIVATE)
    }

    private fun writeReshowMarker(before: Set<String>) {
        reshowPrefs().edit()
            .putStringSet("before", before)
            .putLong("at", System.currentTimeMillis())
            .apply()
    }

    private fun readReshowMarker(): Set<String>? {
        val prefs = reshowPrefs()
        val at = prefs.getLong("at", 0L)
        // a marker older than the visit itself is abandonment, not a
        // reshow: the before-set has rotted past honesty.
        if (at <= 0L || System.currentTimeMillis() - at > 10 * 60 * 1000L) {
            if (at > 0L) clearReshowMarker()
            return null
        }
        return prefs.getStringSet("before", null)?.toSet()
    }

    private fun clearReshowMarker() {
        reshowPrefs().edit().clear().apply()
    }

    private fun settlePickerDiff() {
        clearReshowMarker()
        worker.execute {
            val pending = synchronized(lock) {
                val pending = pendingPicker
                pendingPicker = null
                pending
            } ?: return@execute
            try {
                val after = visibleIds()
                val before = synchronized(lock) { pendingPickerBefore }
                pending.resolve((after - before).sorted().toTypedArray())
            } catch (e: Exception) {
                pending.reject(
                    OneNativeError(E_FAILED, "PhotoLibrary.presentLimitedLibraryPicker: ${e.message ?: "could not read the selection"}")
                )
            }
        }
    }

    override fun presentLimitedLibraryPicker(): Promise<Array<String>> {
        val promise = Promise<Array<String>>()
        if (Build.VERSION.SDK_INT < 34) {
            promise.resolve(emptyArray())
            return promise
        }
        worker.execute {
            if (!isReadDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "PhotoLibrary.presentLimitedLibraryPicker: set native.app.photoLibrary.readWrite")
                )
                return@execute
            }
            synchronized(lock) {
                if (pendingPicker != null || pendingPermission != null) {
                    promise.reject(
                        OneNativeError(E_BUSY, "PhotoLibrary.presentLimitedLibraryPicker: a picker is already open")
                    )
                    return@execute
                }
            }
            // revoking the grant in settings kills the process, so a
            // completed revoke never returns here: the armed marker
            // below reruns the second half on the next call instead.
            val armed = readReshowMarker()
            if (armed != null) {
                clearReshowMarker()
                synchronized(lock) {
                    pendingPicker = promise
                    pendingPickerBefore = armed
                }
                val activity = NitroModules.applicationContext?.currentActivity
                val aware = activity as? PermissionAwareActivity
                if (activity == null || aware == null) {
                    settlePicker(null, OneNativeError(E_UNAVAILABLE, "PhotoLibrary.presentLimitedLibraryPicker: no active view controller"))
                    return@execute
                }
                markAsked("read")
                synchronized(lock) { pendingPickerRerequest = true }
                aware.requestPermissions(readPermissions(), REQUEST_PERMISSION, this)
                return@execute
            }
            // any read grant opens the reshow: under full access the
            // selection already covers everything, so the delta comes
            // back empty unless the user adds assets.
            if (!canRead()) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "PhotoLibrary.presentLimitedLibraryPicker: Photos read permission is required")
                )
                return@execute
            }
            synchronized(lock) {
                pendingPicker = promise
                pendingPickerBefore = visibleIds()
            }
            val activity = NitroModules.applicationContext?.currentActivity
            if (activity == null) {
                settlePicker(null, OneNativeError(E_UNAVAILABLE, "PhotoLibrary.presentLimitedLibraryPicker: no active view controller"))
                return@execute
            }
            // re-requesting the permissions cannot reshow the manager
            // on its own: the os reports the grant as fully held,
            // filters every permission out of the request ("no
            // requestable permission"), and answers instantly with no
            // ui. the user first revokes the grant in app settings,
            // then the return chains into a fresh request whose dialog
            // reopens the manager with the remembered selection.
            markAsked("read")
            writeReshowMarker(pendingPickerBefore)
            try {
                @Suppress("DEPRECATION")
                activity.startActivityForResult(
                    Intent(
                        android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.fromParts("package", context.packageName, null)
                    ),
                    REQUEST_RESHOW
                )
            } catch (e: Exception) {
                clearReshowMarker()
                settlePicker(null, OneNativeError(E_UNAVAILABLE, "PhotoLibrary.presentLimitedLibraryPicker: no settings to reshow from"))
                return@execute
            }
        }
        return promise
    }

    private fun settlePicker(result: Array<String>?, error: Throwable?) {
        val pending = synchronized(lock) {
            val pending = pendingPicker
            pendingPicker = null
            pending
        } ?: return
        if (error != null) pending.reject(error) else pending.resolve(result ?: emptyArray())
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_RESHOW) {
            // settings answers cancelled even when the user changed the
            // grant, so the return itself is the signal. the call gates
            // on a readable grant, so an unreadable return means the
            // user revoked during the visit and chains into a fresh
            // request whose dialog reopens the manager with the
            // remembered selection; any readable return (unchanged,
            // radio-flipped, or upgraded) diffs right away.
            if (canRead()) {
                settlePickerDiff()
                return
            }
            val aware = activity as? PermissionAwareActivity
            if (aware == null) {
                settlePicker(null, OneNativeError(E_UNAVAILABLE, "PhotoLibrary.presentLimitedLibraryPicker: no active view controller"))
                return
            }
            synchronized(lock) { pendingPickerRerequest = true }
            markAsked("read")
            aware.requestPermissions(readPermissions(), REQUEST_PERMISSION, this)
            return
        }
        if (requestCode != REQUEST_CONSENT) return
        val pending = synchronized(lock) {
            val pending = pendingConsent
            val check = pendingConsentCheck
            val verb = pendingConsentVerb
            pendingConsent = null
            pendingConsentCheck = null
            Triple(pending, check, verb)
        }
        if (pending.first == null) return
        if (resultCode != Activity.RESULT_OK) {
            val code = if (pending.third == "deleteAsset") E_DELETE else E_CHANGE
            pending.first!!.reject(
                OneNativeError(code, "PhotoLibrary.${pending.third}: the system consent was dismissed")
            )
            return
        }
        worker.execute {
            try {
                val ok = pending.second?.invoke() ?: true
                if (!ok) {
                    val code = if (pending.third == "deleteAsset") E_DELETE else E_CHANGE
                    pending.first!!.reject(
                        OneNativeError(code, "PhotoLibrary.${pending.third}: Photos did not apply the change")
                    )
                    return@execute
                }
                pending.first!!.resolve(Unit)
            } catch (e: Exception) {
                val code = if (pending.third == "deleteAsset") E_DELETE else E_CHANGE
                pending.first!!.reject(
                    OneNativeError(code, "PhotoLibrary.${pending.third}: ${e.message ?: "Photos did not apply the change"}")
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {}

    override fun listAssets(offset: Double, limit: Double): Promise<PhotoLibraryAssetPage> {
        val promise = Promise<PhotoLibraryAssetPage>()
        worker.execute {
            val page = requirePage(offset, limit, "listAssets", promise) ?: return@execute
            if (!requireRead("listAssets", promise)) return@execute
            try {
                val all = queryAllAssets()
                val start = minOf(page.first, all.size)
                val end = minOf(start + page.second, all.size)
                promise.resolve(
                    PhotoLibraryAssetPage(all.subList(start, end).toTypedArray(), all.size.toDouble())
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_FAILED, "PhotoLibrary.listAssets: ${e.message ?: "could not list assets"}"))
            }
        }
        return promise
    }

    override fun getAsset(identifier: String): Promise<PhotoLibraryAsset> {
        val promise = Promise<PhotoLibraryAsset>()
        worker.execute {
            if (!requireRead("getAsset", promise)) return@execute
            if (identifier.trim().isEmpty()) {
                promise.reject(OneNativeError(E_INPUT, "PhotoLibrary.getAsset: identifier is required"))
                return@execute
            }
            try {
                promise.resolve(
                    readAsset(identifier, "getAsset")
                        ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.getAsset: asset was not found")
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_FAILED, "PhotoLibrary.getAsset: ${e.message ?: "could not read the asset"}"))
            }
        }
        return promise
    }

    override fun listAlbums(offset: Double, limit: Double): Promise<PhotoLibraryAlbumPage> {
        val promise = Promise<PhotoLibraryAlbumPage>()
        worker.execute {
            val page = requirePage(offset, limit, "listAlbums", promise) ?: return@execute
            if (!requireFullAccess("listAlbums", promise)) return@execute
            try {
                val albums = queryAlbums()
                val start = minOf(page.first, albums.size)
                val end = minOf(start + page.second, albums.size)
                promise.resolve(
                    PhotoLibraryAlbumPage(albums.subList(start, end).toTypedArray(), albums.size.toDouble())
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_FAILED, "PhotoLibrary.listAlbums: ${e.message ?: "could not list albums"}"))
            }
        }
        return promise
    }

    override fun getAlbum(identifier: String): Promise<PhotoLibraryAlbum> {
        val promise = Promise<PhotoLibraryAlbum>()
        worker.execute {
            if (!requireFullAccess("getAlbum", promise)) return@execute
            if (identifier.trim().isEmpty()) {
                promise.reject(OneNativeError(E_INPUT, "PhotoLibrary.getAlbum: identifier is required"))
                return@execute
            }
            try {
                promise.resolve(
                    readAlbum(identifier, "getAlbum")
                        ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.getAlbum: album was not found")
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_FAILED, "PhotoLibrary.getAlbum: ${e.message ?: "could not read the album"}"))
            }
        }
        return promise
    }

    override fun createAlbum(title: String): Promise<String> =
        Promise.rejected(OneNativeError("PhotoLibrary.createAlbum needs an iOS or Android build"))

    override fun renameAlbum(identifier: String, title: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun listAlbumAssets(identifier: String, offset: Double, limit: Double): Promise<PhotoLibraryAssetPage> {
        val promise = Promise<PhotoLibraryAssetPage>()
        worker.execute {
            val page = requirePage(offset, limit, "listAlbumAssets", promise) ?: return@execute
            if (!requireFullAccess("listAlbumAssets", promise)) return@execute
            if (identifier.trim().isEmpty()) {
                promise.reject(OneNativeError(E_INPUT, "PhotoLibrary.listAlbumAssets: identifier is required"))
                return@execute
            }
            try {
                readAlbum(identifier, "listAlbumAssets")
                    ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.listAlbumAssets: album was not found")
                val bucketId = identifier.removePrefix("bucket:").toLongOrNull()
                    ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.listAlbumAssets: album was not found")
                val all = queryAllAssets(bucketId)
                val start = minOf(page.first, all.size)
                val end = minOf(start + page.second, all.size)
                promise.resolve(
                    PhotoLibraryAssetPage(all.subList(start, end).toTypedArray(), all.size.toDouble())
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(E_FAILED, "PhotoLibrary.listAlbumAssets: ${e.message ?: "could not list album assets"}")
                )
            }
        }
        return promise
    }

    override fun addAssetToAlbum(albumIdentifier: String, assetIdentifier: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun removeAssetFromAlbum(albumIdentifier: String, assetIdentifier: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun deleteAlbum(identifier: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun setFavorite(identifier: String, favorite: Boolean): Promise<Unit> {
        val promise = Promise<Unit>()
        worker.execute {
            if (!requireRead("setFavorite", promise)) return@execute
            if (identifier.trim().isEmpty()) {
                promise.reject(OneNativeError(E_INPUT, "PhotoLibrary.setFavorite: identifier is required"))
                return@execute
            }
            if (Build.VERSION.SDK_INT < 30) {
                promise.reject(
                    OneNativeError(E_UNSUPPORTED, "PhotoLibrary.setFavorite: favorites need Android 11 or later")
                )
                return@execute
            }
            try {
                val uri = Uri.parse(identifier)
                readAsset(identifier, "setFavorite")
                    ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.setFavorite: asset was not found")
                if (isOwnUri(uri)) {
                    applyFavorite(uri, favorite, "setFavorite")
                    promise.resolve(Unit)
                    return@execute
                }
                val activity = NitroModules.applicationContext?.currentActivity
                if (activity == null) {
                    promise.reject(
                        OneNativeError(E_UNAVAILABLE, "PhotoLibrary.setFavorite: no active view controller")
                    )
                    return@execute
                }
                synchronized(lock) {
                    if (pendingConsent != null) {
                        promise.reject(
                            OneNativeError(E_BUSY, "PhotoLibrary.setFavorite: another consent is already open")
                        )
                        return@execute
                    }
                    pendingConsent = promise
                    pendingConsentVerb = "setFavorite"
                    pendingConsentCheck = {
                        applyFavorite(uri, favorite, "setFavorite")
                        readAsset(identifier, "setFavorite")?.isFavorite == favorite
                    }
                }
                @Suppress("DEPRECATION")
                activity.startIntentSenderForResult(
                    MediaStore.createFavoriteRequest(context.contentResolver, listOf(uri), favorite).intentSender,
                    REQUEST_CONSENT,
                    null,
                    0,
                    0,
                    0,
                    null
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_CHANGE, "PhotoLibrary.setFavorite: ${e.message ?: "Photos did not apply the change"}"))
            }
        }
        return promise
    }

    override fun deleteAsset(identifier: String): Promise<Unit> {
        val promise = Promise<Unit>()
        worker.execute {
            if (!requireRead("deleteAsset", promise)) return@execute
            if (identifier.trim().isEmpty()) {
                promise.reject(OneNativeError(E_INPUT, "PhotoLibrary.deleteAsset: identifier is required"))
                return@execute
            }
            try {
                val uri = Uri.parse(identifier)
                readAsset(identifier, "deleteAsset")
                    ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.deleteAsset: asset was not found")
                if (Build.VERSION.SDK_INT < 30 || isOwnUri(uri)) {
                    val deleted = context.contentResolver.delete(uri, null, null)
                    if (deleted <= 0) {
                        throw OneNativeError(E_DELETE, "PhotoLibrary.deleteAsset: Photos did not delete the asset")
                    }
                    if (readAssetOrNull(identifier) != null) {
                        throw OneNativeError(E_DELETE, "PhotoLibrary.deleteAsset: Photos did not delete the asset")
                    }
                    promise.resolve(Unit)
                    return@execute
                }
                val activity = NitroModules.applicationContext?.currentActivity
                if (activity == null) {
                    promise.reject(
                        OneNativeError(E_UNAVAILABLE, "PhotoLibrary.deleteAsset: no active view controller")
                    )
                    return@execute
                }
                synchronized(lock) {
                    if (pendingConsent != null) {
                        promise.reject(
                            OneNativeError(E_BUSY, "PhotoLibrary.deleteAsset: another consent is already open")
                        )
                        return@execute
                    }
                    pendingConsent = promise
                    pendingConsentVerb = "deleteAsset"
                    pendingConsentCheck = { readAssetOrNull(identifier) == null }
                }
                @Suppress("DEPRECATION")
                activity.startIntentSenderForResult(
                    MediaStore.createDeleteRequest(context.contentResolver, listOf(uri)).intentSender,
                    REQUEST_CONSENT,
                    null,
                    0,
                    0,
                    0,
                    null
                )
            } catch (e: android.app.RecoverableSecurityException) {
                requestRecoverableConsent(e.userAction.actionIntent.intentSender, promise, "deleteAsset") {
                    readAssetOrNull(identifier) == null
                }
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_DELETE, "PhotoLibrary.deleteAsset: ${e.message ?: "Photos did not delete the asset"}"))
            }
        }
        return promise
    }

    private fun requestRecoverableConsent(
        sender: IntentSender,
        promise: Promise<Unit>,
        verb: String,
        check: () -> Boolean
    ) {
        val activity = NitroModules.applicationContext?.currentActivity
        if (activity == null) {
            promise.reject(OneNativeError(E_UNAVAILABLE, "PhotoLibrary.$verb: no active view controller"))
            return
        }
        synchronized(lock) {
            if (pendingConsent != null) {
                promise.reject(OneNativeError(E_BUSY, "PhotoLibrary.$verb: another consent is already open"))
                return
            }
            pendingConsent = promise
            pendingConsentVerb = verb
            pendingConsentCheck = check
        }
        try {
            @Suppress("DEPRECATION")
            activity.startIntentSenderForResult(sender, REQUEST_CONSENT, null, 0, 0, 0, null)
        } catch (e: Exception) {
            val pending = synchronized(lock) {
                val pending = pendingConsent
                pendingConsent = null
                pendingConsentCheck = null
                pending
            }
            val code = if (verb == "deleteAsset") E_DELETE else E_CHANGE
            pending?.reject(OneNativeError(code, "PhotoLibrary.$verb: ${e.message ?: "Photos did not apply the change"}"))
        }
    }

    override fun replaceImageContent(identifier: String, uri: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun replaceVideoContent(identifier: String, uri: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun revertAssetContent(identifier: String): Promise<Unit> =
        Promise.resolved(Unit)

    override fun exportOriginalAsset(identifier: String, allowNetwork: Boolean): Promise<String> =
        exportAsset(identifier, allowNetwork, "exportOriginalAsset")

    override fun exportCurrentImage(identifier: String, allowNetwork: Boolean): Promise<String> =
        exportAsset(identifier, allowNetwork, "exportCurrentImage")

    override fun exportCurrentVideo(identifier: String, allowNetwork: Boolean): Promise<String> =
        exportAsset(identifier, allowNetwork, "exportCurrentVideo")

    private fun exportAsset(identifier: String, allowNetwork: Boolean, verb: String): Promise<String> {
        val promise = Promise<String>()
        worker.execute {
            if (!requireRead(verb, promise)) return@execute
            if (identifier.trim().isEmpty()) {
                promise.reject(OneNativeError(E_INPUT, "PhotoLibrary.$verb: identifier is required"))
                return@execute
            }
            try {
                val uri = Uri.parse(identifier)
                val asset = readAsset(identifier, verb)
                    ?: throw OneNativeError(E_NOT_FOUND, "PhotoLibrary.$verb: asset was not found")
                if (verb == "exportCurrentImage" && asset.mediaType != PhotoLibraryMediaType.IMAGE) {
                    throw OneNativeError(E_UNSUPPORTED, "PhotoLibrary.$verb: an image asset is required")
                }
                if (verb == "exportCurrentVideo" && asset.mediaType != PhotoLibraryMediaType.VIDEO) {
                    throw OneNativeError(E_UNSUPPORTED, "PhotoLibrary.$verb: a video asset is required")
                }
                val extension = exportExtension(uri, asset.mediaType)
                val directory = File(context.cacheDir, "one-native-photo").apply { mkdirs() }
                val file = File(directory, "one-photo-${UUID.randomUUID()}.$extension")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    file.outputStream().use { output -> input.copyTo(output) }
                } ?: throw OneNativeError(E_EXPORT, "PhotoLibrary.$verb: Photos did not return the asset")
                if (file.length() == 0L) {
                    file.delete()
                    throw OneNativeError(E_EXPORT, "PhotoLibrary.$verb: Photos did not return the asset")
                }
                promise.resolve(Uri.fromFile(file).toString())
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_EXPORT, "PhotoLibrary.$verb: ${e.message ?: "Photos did not return the asset"}"))
            }
        }
        return promise
    }

    override fun saveImage(uri: String): Promise<String> = save(uri, "saveImage", isVideo = false)

    override fun saveVideo(uri: String): Promise<String> = save(uri, "saveVideo", isVideo = true)

    private fun save(uri: String, verb: String, isVideo: Boolean): Promise<String> {
        val promise = Promise<String>()
        worker.execute {
            if (!isAddDeclared() && !isReadDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "PhotoLibrary.$verb: set native.app.photoLibrary.addOnly or readWrite")
                )
                return@execute
            }
            val canAdd = isAddDeclared() && getAddPermissionStatus() == PhotoLibraryPermissionStatus.AUTHORIZED
            if (!canAdd && !(isReadDeclared() && canRead())) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "PhotoLibrary.$verb: Photos add-only or read/write permission is required")
                )
                return@execute
            }
            val parsed = try {
                Uri.parse(uri)
            } catch (e: Exception) {
                null
            }
            if (parsed == null || parsed.scheme != "file" ||
                !(parsed.host.isNullOrEmpty() || parsed.host == "localhost") ||
                !parsed.query.isNullOrEmpty() || !parsed.fragment.isNullOrEmpty()
            ) {
                promise.reject(OneNativeError(E_URI, "PhotoLibrary.$verb: an existing file:// URI is required"))
                return@execute
            }
            val source = File(parsed.path ?: "")
            if (!source.exists() || source.isDirectory) {
                promise.reject(OneNativeError(E_FILE, "PhotoLibrary.$verb: file does not exist"))
                return@execute
            }
            try {
                val resolver = context.contentResolver
                val name = "one-${UUID.randomUUID()}${if (source.extension.isNotEmpty()) ".${source.extension}" else ""}"
                val collection = if (Build.VERSION.SDK_INT >= 29) {
                    // identifiers are uri strings, so saves must use
                    // the same volume as mediaCollections or the saved
                    // asset never matches its own listing.
                    if (isVideo) MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                    else MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
                } else {
                    if (isVideo) MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                    else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                }
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, name)
                    if (Build.VERSION.SDK_INT >= 29) {
                        put(
                            MediaStore.MediaColumns.RELATIVE_PATH,
                            if (isVideo) Environment.DIRECTORY_MOVIES else Environment.DIRECTORY_PICTURES
                        )
                        put(MediaStore.MediaColumns.IS_PENDING, 1)
                    }
                }
                val inserted = resolver.insert(collection, values)
                    ?: throw OneNativeError(E_SAVE, "PhotoLibrary.$verb: Photos did not create an asset")
                try {
                    resolver.openOutputStream(inserted)?.use { output ->
                        source.inputStream().use { input -> input.copyTo(output) }
                    } ?: throw OneNativeError(E_SAVE, "PhotoLibrary.$verb: Photos did not create an asset")
                    backfillMetadata(inserted, source, isVideo)
                    if (Build.VERSION.SDK_INT >= 29) {
                        val done = ContentValues().apply {
                            put(MediaStore.MediaColumns.IS_PENDING, 0)
                        }
                        resolver.update(inserted, done, null, null)
                    }
                } catch (e: Exception) {
                    resolver.delete(inserted, null, null)
                    throw e
                }
                promise.resolve(inserted.toString())
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_SAVE, "PhotoLibrary.$verb: ${e.message ?: "Photos did not create an asset"}"))
            }
        }
        return promise
    }

    private fun requireRead(verb: String, promise: Promise<*>): Boolean {
        if (!isReadDeclared()) {
            @Suppress("UNCHECKED_CAST")
            (promise as Promise<Any>).reject(
                OneNativeError(E_MANIFEST, "PhotoLibrary.$verb: set native.app.photoLibrary.readWrite")
            )
            return false
        }
        if (!canRead()) {
            @Suppress("UNCHECKED_CAST")
            (promise as Promise<Any>).reject(
                OneNativeError(E_PERMISSION, "PhotoLibrary.$verb: Photos read permission is required")
            )
            return false
        }
        return true
    }

    private fun requireFullAccess(verb: String, promise: Promise<*>): Boolean {
        if (!isReadDeclared()) {
            @Suppress("UNCHECKED_CAST")
            (promise as Promise<Any>).reject(
                OneNativeError(E_MANIFEST, "PhotoLibrary.$verb: set native.app.photoLibrary.readWrite")
            )
            return false
        }
        if (readStatus() != PhotoLibraryPermissionStatus.AUTHORIZED) {
            @Suppress("UNCHECKED_CAST")
            (promise as Promise<Any>).reject(
                OneNativeError(E_PERMISSION, "PhotoLibrary.$verb: full Photos read/write permission is required")
            )
            return false
        }
        return true
    }

    private fun requirePage(
        offset: Double,
        limit: Double,
        verb: String,
        promise: Promise<*>
    ): Pair<Int, Int>? {
        if (
            !offset.isFinite() || offset < 0 || offset > 1_000_000 || offset != kotlin.math.floor(offset) ||
            !limit.isFinite() || limit < 1 || limit > 100 || limit != kotlin.math.floor(limit)
        ) {
            @Suppress("UNCHECKED_CAST")
            (promise as Promise<Any>).reject(
                OneNativeError(E_INPUT, "PhotoLibrary.$verb: offset must be 0..1000000 and limit must be 1..100 integers")
            )
            return null
        }
        return Pair(offset.toInt(), limit.toInt())
    }

    private fun readPermissions(): Array<String> =
        if (Build.VERSION.SDK_INT >= 33) {
            arrayOf(Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

    private fun readStatus(): PhotoLibraryPermissionStatus {
        if (Build.VERSION.SDK_INT >= 33) {
            val images = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_IMAGES) ==
                PackageManager.PERMISSION_GRANTED
            val video = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_VIDEO) ==
                PackageManager.PERMISSION_GRANTED
            val userSelected = Build.VERSION.SDK_INT >= 34 &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) ==
                    PackageManager.PERMISSION_GRANTED
            // a partial grant reports the concrete permissions as
            // granted at every layer (check, results, appops), so a
            // triple-granted state echoes the os as authorized; the
            // picker return stays a strict before/after delta either way.
            if (images && video) return PhotoLibraryPermissionStatus.AUTHORIZED
            if (userSelected) return PhotoLibraryPermissionStatus.LIMITED
            if (images || video) return PhotoLibraryPermissionStatus.LIMITED
        } else {
            if (
                ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) ==
                    PackageManager.PERMISSION_GRANTED
            ) {
                return PhotoLibraryPermissionStatus.AUTHORIZED
            }
            val activity = context.currentActivity
            if (activity != null &&
                ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.READ_EXTERNAL_STORAGE)
            ) {
                return PhotoLibraryPermissionStatus.DENIED
            }
        }
        val activity = context.currentActivity
        if (activity != null && readPermissions().any {
            ActivityCompat.shouldShowRequestPermissionRationale(activity, it)
        }
        ) {
            return PhotoLibraryPermissionStatus.DENIED
        }
        return if (wasAsked("read")) PhotoLibraryPermissionStatus.DENIED else PhotoLibraryPermissionStatus.NOTDETERMINED
    }

    private fun canRead(): Boolean {
        val status = readStatus()
        return status == PhotoLibraryPermissionStatus.AUTHORIZED || status == PhotoLibraryPermissionStatus.LIMITED
    }

    private fun visibleIds(): Set<String> {
        if (!canRead()) return emptySet()
        val out = mutableSetOf<String>()
        for (collection in mediaCollections()) {
            context.contentResolver.query(
                collection.uri,
                arrayOf(MediaStore.MediaColumns._ID),
                null,
                null,
                null
            )?.use { cursor ->
                while (cursor.moveToNext()) {
                    out.add(ContentUris.withAppendedId(collection.uri, cursor.getLong(0)).toString())
                }
            }
        }
        return out
    }

    private data class MediaCollection(val uri: Uri, val type: PhotoLibraryMediaType)

    private fun mediaCollections(): List<MediaCollection> {
        return if (Build.VERSION.SDK_INT >= 29) {
            listOf(
                MediaCollection(
                    MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                    PhotoLibraryMediaType.IMAGE
                ),
                MediaCollection(
                    MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                    PhotoLibraryMediaType.VIDEO
                ),
                MediaCollection(
                    MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL),
                    PhotoLibraryMediaType.AUDIO
                )
            )
        } else {
            listOf(
                MediaCollection(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, PhotoLibraryMediaType.IMAGE),
                MediaCollection(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, PhotoLibraryMediaType.VIDEO),
                MediaCollection(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, PhotoLibraryMediaType.AUDIO)
            )
        }
    }

    private fun queryAllAssets(bucketId: Long? = null): List<PhotoLibraryAsset> {
        val out = mutableListOf<PhotoLibraryAsset>()
        for (collection in mediaCollections()) {
            val selection = if (bucketId != null) "${MediaStore.MediaColumns.BUCKET_ID}=?" else null
            val args = if (bucketId != null) arrayOf(bucketId.toString()) else null
            context.contentResolver.query(
                collection.uri,
                assetColumns(collection.type),
                selection,
                args,
                "${MediaStore.MediaColumns.DATE_ADDED} DESC"
            )?.use { cursor ->
                while (cursor.moveToNext()) {
                    out.add(assetFromCursor(cursor, collection))
                }
            }
        }
        // audio rows carry no taken date, so the merge sorts on the resolved
        // creation time to keep newest-first across collections.
        return out.sortedByDescending { it.creationDateMs ?: 0.0 }
    }

    private fun assetColumns(type: PhotoLibraryMediaType): Array<String> {
        val columns = mutableListOf(
            MediaStore.MediaColumns._ID,
            MediaStore.MediaColumns.DATE_ADDED,
            MediaStore.MediaColumns.WIDTH,
            MediaStore.MediaColumns.HEIGHT
        )
        if (type != PhotoLibraryMediaType.AUDIO) {
            columns.add(MediaStore.Images.Media.DATE_TAKEN)
        }
        if (type == PhotoLibraryMediaType.VIDEO || type == PhotoLibraryMediaType.AUDIO) {
            columns.add(MediaStore.MediaColumns.DURATION)
        }
        if (Build.VERSION.SDK_INT >= 29) {
            columns.add(MediaStore.MediaColumns.IS_FAVORITE)
        }
        return columns.toTypedArray()
    }

    private fun assetFromCursor(cursor: android.database.Cursor, collection: MediaCollection): PhotoLibraryAsset {
        val id = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID))
        val added = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED))
        val width = cursor.getColumnIndex(MediaStore.MediaColumns.WIDTH).let {
            if (it >= 0) cursor.getInt(it) else 0
        }
        val height = cursor.getColumnIndex(MediaStore.MediaColumns.HEIGHT).let {
            if (it >= 0) cursor.getInt(it) else 0
        }
        var created: Double? = null
        if (collection.type != PhotoLibraryMediaType.AUDIO) {
            val takenIndex = cursor.getColumnIndex(MediaStore.Images.Media.DATE_TAKEN)
            val taken = if (takenIndex >= 0) cursor.getLong(takenIndex) else 0L
            created = if (taken > 0) taken.toDouble() else added * 1000.0
        } else if (added > 0) {
            created = added * 1000.0
        }
        val durationIndex = cursor.getColumnIndex(MediaStore.MediaColumns.DURATION)
        val duration = if (durationIndex >= 0 && !cursor.isNull(durationIndex)) {
            cursor.getLong(durationIndex).toDouble()
        } else {
            0.0
        }
        val favoriteIndex = cursor.getColumnIndex(MediaStore.MediaColumns.IS_FAVORITE)
        val favorite = favoriteIndex >= 0 && !cursor.isNull(favoriteIndex) && cursor.getInt(favoriteIndex) == 1
        return PhotoLibraryAsset(
            ContentUris.withAppendedId(collection.uri, id).toString(),
            collection.type,
            width.toDouble(),
            height.toDouble(),
            duration,
            created,
            favorite,
            false
        )
    }

    private fun readAsset(identifier: String, verb: String): PhotoLibraryAsset? =
        readAssetOrNull(identifier)

    private fun readAssetOrNull(identifier: String): PhotoLibraryAsset? {
        val uri = try {
            Uri.parse(identifier)
        } catch (e: Exception) {
            return null
        }
        val type = when {
            uri.toString().contains("/images/") -> PhotoLibraryMediaType.IMAGE
            uri.toString().contains("/video/") -> PhotoLibraryMediaType.VIDEO
            uri.toString().contains("/audio/") -> PhotoLibraryMediaType.AUDIO
            else -> return null
        }
        val collection = MediaCollection(uri, type)
        return try {
            context.contentResolver.query(uri, assetColumns(type), null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val asset = assetFromCursor(cursor, collection)
                    asset.copy(identifier = uri.toString())
                } else {
                    null
                }
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun queryAlbums(): List<PhotoLibraryAlbum> {
        val buckets = mutableMapOf<Long, String>()
        for (collection in mediaCollections()) {
            if (collection.type == PhotoLibraryMediaType.AUDIO) continue
            context.contentResolver.query(
                collection.uri,
                arrayOf(MediaStore.MediaColumns.BUCKET_ID, MediaStore.MediaColumns.BUCKET_DISPLAY_NAME),
                null,
                null,
                null
            )?.use { cursor ->
                while (cursor.moveToNext()) {
                    val id = cursor.getLong(0)
                    if (!buckets.containsKey(id)) {
                        buckets[id] = cursor.getString(1) ?: ""
                    }
                }
            }
        }
        return buckets.map { PhotoLibraryAlbum("bucket:${it.key}", it.value) }
            .sortedWith(compareBy({ it.title.lowercase() }, { it.identifier }))
    }

    private fun readAlbum(identifier: String, verb: String): PhotoLibraryAlbum? {
        val bucketId = identifier.removePrefix("bucket:").toLongOrNull() ?: return null
        if (!identifier.startsWith("bucket:")) return null
        for (collection in mediaCollections()) {
            if (collection.type == PhotoLibraryMediaType.AUDIO) continue
            context.contentResolver.query(
                collection.uri,
                arrayOf(MediaStore.MediaColumns.BUCKET_DISPLAY_NAME),
                "${MediaStore.MediaColumns.BUCKET_ID}=?",
                arrayOf(bucketId.toString()),
                null,
                null
            )?.use { cursor ->
                if (cursor.moveToFirst()) {
                    return PhotoLibraryAlbum(identifier, cursor.getString(0) ?: "")
                }
            }
        }
        return null
    }

    private fun exportExtension(uri: Uri, type: PhotoLibraryMediaType): String {
        // keep the stored extension so byte comparisons see the same file
        // kind; fall back to the mime type, then the media default.
        val fromRow = try {
            context.contentResolver.query(
                uri,
                arrayOf(MediaStore.MediaColumns.DISPLAY_NAME, MediaStore.MediaColumns.MIME_TYPE),
                null,
                null,
                null
            )?.use { cursor ->
                if (cursor.moveToFirst()) Pair(cursor.getString(0), cursor.getString(1))
                else null
            }
        } catch (e: Exception) {
            null
        }
        fromRow?.first?.substringAfterLast('.', "")?.lowercase()?.ifEmpty { null }?.let {
            if (it.length in 2..5 && it.all { char -> char.isLetterOrDigit() }) return it
        }
        when (fromRow?.second?.lowercase()) {
            "image/heic" -> return "heic"
            "image/heif" -> return "heif"
            "image/jpeg" -> return "jpg"
            "image/png" -> return "png"
            "image/webp" -> return "webp"
            "image/gif" -> return "gif"
            "video/mp4", "video/quicktime" -> return "mp4"
            "audio/mp4", "audio/x-m4a" -> return "m4a"
        }
        return when (type) {
            PhotoLibraryMediaType.VIDEO -> "mp4"
            PhotoLibraryMediaType.AUDIO -> "m4a"
            else -> "jpg"
        }
    }

    private fun backfillMetadata(inserted: Uri, source: File, isVideo: Boolean) {
        // MediaStore extracts dimensions asynchronously; backfill from the
        // source file so immediate reads see real metadata.
        try {
            val values = ContentValues()
            if (isVideo) {
                val retriever = android.media.MediaMetadataRetriever()
                try {
                    retriever.setDataSource(source.absolutePath)
                    retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                        ?.toIntOrNull()?.let { values.put(MediaStore.MediaColumns.WIDTH, it) }
                    retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                        ?.toIntOrNull()?.let { values.put(MediaStore.MediaColumns.HEIGHT, it) }
                    retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)
                        ?.toLongOrNull()?.let { values.put(MediaStore.MediaColumns.DURATION, it) }
                } finally {
                    try {
                        retriever.release()
                    } catch (ignored: Exception) {
                    }
                }
            } else {
                val options = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
                android.graphics.BitmapFactory.decodeFile(source.absolutePath, options)
                if (options.outWidth > 0 && options.outHeight > 0) {
                    values.put(MediaStore.MediaColumns.WIDTH, options.outWidth)
                    values.put(MediaStore.MediaColumns.HEIGHT, options.outHeight)
                }
            }
            if (values.size() > 0) {
                context.contentResolver.update(inserted, values, null, null)
            }
        } catch (e: Exception) {
        }
    }

    private fun applyFavorite(uri: Uri, favorite: Boolean, verb: String) {
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.IS_FAVORITE, if (favorite) 1 else 0)
        }
        val updated = context.contentResolver.update(uri, values, null, null)
        if (updated <= 0) {
            throw OneNativeError(E_CHANGE, "PhotoLibrary.$verb: Photos did not apply the change")
        }
    }

    private fun isOwnUri(uri: Uri): Boolean {
        if (Build.VERSION.SDK_INT < 29) return true
        return try {
            context.contentResolver.query(
                uri,
                arrayOf(MediaStore.MediaColumns.OWNER_PACKAGE_NAME),
                null,
                null,
                null
            )?.use { cursor ->
                cursor.moveToFirst() && cursor.getString(0) == context.packageName
            } ?: false
        } catch (e: Exception) {
            false
        }
    }

    private fun declaredPermissions(): Set<String> {
        return try {
            val info = if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
            }
            info.requestedPermissions?.toSet() ?: emptySet()
        } catch (e: Exception) {
            emptySet()
        }
    }

    private fun isAddDeclared(): Boolean {
        // addOnly config stamps no install-time permission on API 29+; the
        // prebuild marker is the photo-library meta-data, while below 29
        // the write permission is the declaration.
        if (Build.VERSION.SDK_INT >= 29) return hasPhotoMetaData("addOnly")
        return declaredPermissions().contains(Manifest.permission.WRITE_EXTERNAL_STORAGE)
    }

    private fun isReadDeclared(): Boolean {
        val declared = declaredPermissions()
        if (Build.VERSION.SDK_INT >= 33) {
            return declared.contains(Manifest.permission.READ_MEDIA_IMAGES) ||
                declared.contains(Manifest.permission.READ_MEDIA_VIDEO)
        }
        return declared.contains(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

    private fun hasPhotoMetaData(key: String): Boolean {
        return try {
            val info = if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getApplicationInfo(
                    context.packageName,
                    PackageManager.ApplicationInfoFlags.of(PackageManager.GET_META_DATA.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
            }
            info.metaData?.getBoolean("one.photoLibrary.$key", false) == true
        } catch (e: Exception) {
            false
        }
    }

    private fun wasAsked(kind: String): Boolean =
        context.getSharedPreferences("one-native-photo-library", Activity.MODE_PRIVATE)
            .getBoolean("one-native-photo-library.$kind-asked", false)

    private fun markAsked(kind: String) {
        context.getSharedPreferences("one-native-photo-library", Activity.MODE_PRIVATE)
            .edit().putBoolean("one-native-photo-library.$kind-asked", true).apply()
    }

    companion object {
        private const val E_MANIFEST = "E_PHOTO_LIBRARY_MANIFEST"
        private const val E_PERMISSION = "E_PHOTO_LIBRARY_PERMISSION"
        private const val E_INPUT = "E_PHOTO_LIBRARY_INPUT"
        private const val E_NOT_FOUND = "E_PHOTO_LIBRARY_NOT_FOUND"
        private const val E_UNSUPPORTED = "E_PHOTO_LIBRARY_UNSUPPORTED"
        private const val E_URI = "E_PHOTO_LIBRARY_URI"
        private const val E_FILE = "E_PHOTO_LIBRARY_FILE"
        private const val E_SAVE = "E_PHOTO_LIBRARY_SAVE"
        private const val E_EXPORT = "E_PHOTO_LIBRARY_EXPORT"
        private const val E_CHANGE = "E_PHOTO_LIBRARY_CHANGE"
        private const val E_DELETE = "E_PHOTO_LIBRARY_DELETE"
        private const val E_BUSY = "E_PHOTO_LIBRARY_BUSY"
        private const val E_UNAVAILABLE = "E_PHOTO_LIBRARY_UNAVAILABLE"
        private const val E_FAILED = "E_PHOTO_LIBRARY_FAILED"
        private const val REQUEST_PERMISSION = 0x2E01
        private const val REQUEST_RESHOW = 0x2E02
        private const val REQUEST_CONSENT = 0x2E03
    }
}
