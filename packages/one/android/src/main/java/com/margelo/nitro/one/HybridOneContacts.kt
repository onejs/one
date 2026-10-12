package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.ContentProviderOperation
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.ContactsContract
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.concurrent.Executors

// address book over ContactsContract. identifiers are Contacts row ids.
// a second picker while one is pending rejects; canceling resolves null;
// teardown rejects the pending promise so nothing hangs. calls arrive on
// the js thread and provider work runs on one worker, so the pending slots
// are only taken or settled under the lock.
class HybridOneContacts : HybridOneContactsSpec(), ActivityEventListener, PermissionListener {
    private val lock = Any()
    private var pendingPicker: Promise<ContactInfo?>? = null
    private var pendingPermission: Promise<ContactsPermissionStatus>? = null
    private val worker = Executors.newSingleThreadExecutor()

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Contacts: the react context is not ready")

    init {
        NitroModules.applicationContext?.addActivityEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeActivityEventListener(this)
        val picker: Promise<ContactInfo?>?
        val permission: Promise<ContactsPermissionStatus>?
        synchronized(lock) {
            picker = pendingPicker
            permission = pendingPermission
            pendingPicker = null
            pendingPermission = null
        }
        picker?.reject(OneNativeError(E_PICKER, "Contacts.pickContact: torn down mid-request"))
        permission?.reject(OneNativeError(E_PERMISSION, "Contacts.requestPermission: torn down mid-request"))
        worker.shutdownNow()
        super.dispose()
    }

    override fun getPermissionStatus(): ContactsPermissionStatus = readStatus()

    override fun requestPermission(): Promise<ContactsPermissionStatus> {
        val promise = Promise<ContactsPermissionStatus>()
        if (!isContactsDeclared()) {
            promise.reject(
                OneNativeError(E_MANIFEST, "Contacts.requestPermission: set native.app.contacts.usage")
            )
            return promise
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve(readStatus())
            return promise
        }
        val activity = context.currentActivity
        val aware = activity as? PermissionAwareActivity
        if (activity == null || aware == null) {
            promise.reject(
                OneNativeError(E_PICKER, "Contacts.requestPermission: found no activity to prompt from")
            )
            return promise
        }
        synchronized(lock) {
            if (pendingPermission != null) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Contacts.requestPermission: another request is already in flight")
                )
                return promise
            }
            pendingPermission = promise
        }
        markAsked()
        aware.requestPermissions(
            arrayOf(Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS),
            REQUEST_PERMISSION,
            this
        )
        return promise
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != REQUEST_PERMISSION) return false
        val pending = synchronized(lock) {
            val pending = pendingPermission
            pendingPermission = null
            pending
        }
        pending?.resolve(readStatus())
        return true
    }

    override fun pickContact(): Promise<ContactInfo?> {
        val promise = Promise<ContactInfo?>()
        synchronized(lock) {
            if (pendingPicker != null) {
                promise.reject(
                    OneNativeError(E_PICKER, "Contacts.pickContact: a picker is already open")
                )
                return promise
            }
            pendingPicker = promise
        }
        val activity = NitroModules.applicationContext?.currentActivity
        if (activity == null) {
            settlePicker(null, OneNativeError(E_PICKER, "Contacts.pickContact: no active view controller"))
            return promise
        }
        try {
            @Suppress("DEPRECATION")
            activity.startActivityForResult(
                Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI),
                REQUEST_PICKER,
                null
            )
        } catch (e: Exception) {
            settlePicker(null, OneNativeError(E_PICKER, "Contacts.pickContact: ${e.message ?: "could not open the picker"}"))
        }
        return promise
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_PICKER) return
        if (resultCode != Activity.RESULT_OK || data?.data == null) {
            settlePicker(null, null)
            return
        }
        val uri = data.data!!
        worker.execute {
            try {
                settlePicker(readContactUri(uri.toString(), "pickContact"), null)
            } catch (e: OneNativeError) {
                settlePicker(null, e)
            } catch (e: Exception) {
                settlePicker(null, OneNativeError(E_FETCH, "Contacts.pickContact: ${e.message ?: "could not read the contact"}"))
            }
        }
    }

    override fun onNewIntent(intent: Intent) {}

    private fun settlePicker(info: ContactInfo?, error: Throwable?) {
        val pending = synchronized(lock) {
            val pending = pendingPicker
            pendingPicker = null
            pending
        } ?: return
        if (error != null) pending.reject(error) else pending.resolve(info)
    }

    override fun search(name: String, limit: Double): Promise<Array<ContactInfo>> {
        val promise = Promise<Array<ContactInfo>>()
        worker.execute {
            if (!isContactsDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "Contacts.search: set native.app.contacts.usage")
                )
                return@execute
            }
            if (!canAccess()) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Contacts.search: Contacts permission is required")
                )
                return@execute
            }
            val text = name.trim()
            if (text.isEmpty() || !limit.isFinite() || limit < 1 || limit > 100 || limit != kotlin.math.floor(limit)) {
                promise.reject(
                    OneNativeError(E_INPUT, "Contacts.search: provide a name and an integer limit from 1 to 100")
                )
                return@execute
            }
            try {
                val found = mutableListOf<ContactInfo>()
                val uri = android.net.Uri.withAppendedPath(
                    ContactsContract.Contacts.CONTENT_FILTER_URI,
                    android.net.Uri.encode(text)
                )
                context.contentResolver.query(
                    uri,
                    arrayOf(ContactsContract.Contacts._ID),
                    null,
                    null,
                    null
                )?.use { cursor ->
                    while (cursor.moveToNext() && found.size < limit.toInt()) {
                        val id = cursor.getLong(0).toString()
                        readContact(id, "search")?.let { found.add(it) }
                    }
                }
                promise.resolve(found.toTypedArray())
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(E_FETCH, "Contacts.search: ${e.message ?: "could not search contacts"}")
                )
            }
        }
        return promise
    }

    override fun create(input: ContactInput): Promise<String> {
        val promise = Promise<String>()
        worker.execute {
            if (!isContactsDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "Contacts.create: set native.app.contacts.usage")
                )
                return@execute
            }
            if (!canAccess()) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Contacts.create: Contacts permission is required")
                )
                return@execute
            }
            val given = input.givenName.trim()
            val family = input.familyName.trim()
            if (given.isEmpty() && family.isEmpty()) {
                promise.reject(
                    OneNativeError(E_INPUT, "Contacts.create: provide a given or family name")
                )
                return@execute
            }
            val addresses = input.postalAddresses ?: emptyArray()
            if (hasBlank(input.phoneNumbers) || hasBlank(input.emailAddresses) || !validAddresses(addresses)) {
                promise.reject(
                    OneNativeError(E_INPUT, "Contacts.create: phone, email, or postal address is invalid")
                )
                return@execute
            }
            try {
                val ops = ArrayList<ContentProviderOperation>()
                ops.add(
                    ContentProviderOperation.newInsert(ContactsContract.RawContacts.CONTENT_URI)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_TYPE, null as String?)
                        .withValue(ContactsContract.RawContacts.ACCOUNT_NAME, null as String?)
                        .build()
                )
                ops.add(
                    ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, 0)
                        .withValue(
                            ContactsContract.Data.MIMETYPE,
                            ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
                        )
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, given)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME, family)
                        .build()
                )
                for (phone in input.phoneNumbers) {
                    ops.add(dataInsert(0).withPhone(phone, ContactsContract.CommonDataKinds.Phone.TYPE_MAIN, null).build())
                }
                for (email in input.emailAddresses) {
                    ops.add(dataInsert(0).withEmail(email, ContactsContract.CommonDataKinds.Email.TYPE_HOME, null).build())
                }
                for (address in addresses) {
                    ops.add(
                        dataInsert(0)
                            .withPostal(address, ContactsContract.CommonDataKinds.StructuredPostal.TYPE_HOME, null)
                            .build()
                    )
                }
                val results = context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
                val rawUri = results[0].uri
                    ?: throw OneNativeError(E_SAVE, "Contacts.create: saved contact has no identifier")
                val rawId = ContentUris.parseId(rawUri)
                val contactId = context.contentResolver.query(
                    ContentUris.withAppendedId(ContactsContract.RawContacts.CONTENT_URI, rawId),
                    arrayOf(ContactsContract.RawContacts.CONTACT_ID),
                    null,
                    null,
                    null
                )?.use { cursor ->
                    if (cursor.moveToFirst()) cursor.getLong(0).toString() else null
                } ?: throw OneNativeError(E_SAVE, "Contacts.create: saved contact has no identifier")
                promise.resolve(contactId)
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(E_SAVE, "Contacts.create: ${e.message ?: "could not save the contact"}")
                )
            }
        }
        return promise
    }

    override fun update(identifier: String, changes: ContactChanges): Promise<ContactInfo> {
        val promise = Promise<ContactInfo>()
        worker.execute {
            if (!isContactsDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "Contacts.update: set native.app.contacts.usage")
                )
                return@execute
            }
            if (!canAccess()) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Contacts.update: Contacts permission is required")
                )
                return@execute
            }
            val id = identifier.trim()
            if (
                id.isEmpty() || (changes.givenName == null && changes.familyName == null &&
                    changes.phoneNumbers == null && changes.emailAddresses == null &&
                    changes.postalAddresses == null)
            ) {
                promise.reject(
                    OneNativeError(E_INPUT, "Contacts.update: an identifier and at least one change are required")
                )
                return@execute
            }
            changes.phoneNumbers?.let {
                if (hasBlank(it)) {
                    promise.reject(
                        OneNativeError(E_INPUT, "Contacts.update: phone numbers cannot be blank")
                    )
                    return@execute
                }
            }
            changes.emailAddresses?.let {
                if (hasBlank(it)) {
                    promise.reject(
                        OneNativeError(E_INPUT, "Contacts.update: email addresses cannot be blank")
                    )
                    return@execute
                }
            }
            changes.postalAddresses?.let {
                if (!validAddresses(it)) {
                    promise.reject(
                        OneNativeError(E_INPUT, "Contacts.update: postal address is invalid")
                    )
                    return@execute
                }
            }
            try {
                val current = readContact(id, "update")
                    ?: throw OneNativeError(E_NOT_FOUND, "Contacts.update: contact was not found")
                if (changes.givenName != null || changes.familyName != null) {
                    val given = (changes.givenName ?: current.givenName).trim()
                    val family = (changes.familyName ?: current.familyName).trim()
                    if (given.isEmpty() && family.isEmpty()) {
                        throw OneNativeError(E_INPUT, "Contacts.update: provide a given or family name")
                    }
                }
                val rawIds = rawContactIds(id)
                if (rawIds.isEmpty()) {
                    throw OneNativeError(E_NOT_FOUND, "Contacts.update: contact was not found")
                }
                val target = rawIds[0]
                val ops = ArrayList<ContentProviderOperation>()
                if (changes.givenName != null || changes.familyName != null) {
                    val given = (changes.givenName ?: current.givenName).trim()
                    val family = (changes.familyName ?: current.familyName).trim()
                    ops.add(
                        ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                            .withSelection(
                                "${ContactsContract.Data.RAW_CONTACT_ID}=? AND ${ContactsContract.Data.MIMETYPE}=?",
                                arrayOf(
                                    target.toString(),
                                    ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
                                )
                            )
                            .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, given)
                            .withValue(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME, family)
                            .build()
                    )
                }
                changes.phoneNumbers?.let { values ->
                    replaceLabeled(
                        ops, target,
                        ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE,
                        ContactsContract.CommonDataKinds.Phone.NUMBER,
                        values.toList(),
                        existingLabeled(
                            target,
                            ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                        ),
                        ContactsContract.CommonDataKinds.Phone.TYPE_MAIN
                    )
                }
                changes.emailAddresses?.let { values ->
                    replaceLabeled(
                        ops, target,
                        ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE,
                        ContactsContract.CommonDataKinds.Email.ADDRESS,
                        values.toList(),
                        existingLabeled(
                            target,
                            ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE,
                            ContactsContract.CommonDataKinds.Email.ADDRESS
                        ),
                        ContactsContract.CommonDataKinds.Email.TYPE_HOME
                    )
                }
                changes.postalAddresses?.let { values ->
                    replacePostals(ops, target, values.toList())
                }
                if (ops.isNotEmpty()) {
                    context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
                }
                promise.resolve(
                    readContact(id, "update")
                        ?: throw OneNativeError(E_SAVE, "Contacts.update: saved contact has no identifier")
                )
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(E_SAVE, "Contacts.update: ${e.message ?: "could not save the contact"}")
                )
            }
        }
        return promise
    }

    override fun remove(identifier: String): Promise<Unit> {
        val promise = Promise<Unit>()
        worker.execute {
            if (!isContactsDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "Contacts.delete: set native.app.contacts.usage")
                )
                return@execute
            }
            if (!canAccess()) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Contacts.delete: Contacts permission is required")
                )
                return@execute
            }
            val id = identifier.trim()
            if (id.isEmpty()) {
                promise.reject(
                    OneNativeError(E_INPUT, "Contacts.delete: identifier is required")
                )
                return@execute
            }
            try {
                val row = id.toLongOrNull()
                val deleted = if (row == null) {
                    0
                } else {
                    context.contentResolver.delete(
                        ContentUris.withAppendedId(ContactsContract.Contacts.CONTENT_URI, row),
                        null,
                        null
                    )
                }
                if (deleted <= 0) {
                    throw OneNativeError(E_NOT_FOUND, "Contacts.delete: contact was not found")
                }
                promise.resolve(Unit)
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(E_DELETE, "Contacts.delete: ${e.message ?: "could not delete the contact"}")
                )
            }
        }
        return promise
    }

    private fun readStatus(): ContactsPermissionStatus {
        val granted =
            ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) ==
                PackageManager.PERMISSION_GRANTED
        if (granted) return ContactsPermissionStatus.AUTHORIZED
        val activity = context.currentActivity
        if (activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.READ_CONTACTS)
        ) {
            return ContactsPermissionStatus.DENIED
        }
        return if (wasAsked()) ContactsPermissionStatus.DENIED else ContactsPermissionStatus.NOTDETERMINED
    }

    private fun canAccess(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) ==
            PackageManager.PERMISSION_GRANTED

    private fun isContactsDeclared(): Boolean {
        val info = try {
            if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
            }
        } catch (e: Exception) {
            return false
        }
        return info.requestedPermissions?.contains(Manifest.permission.READ_CONTACTS) == true
    }

    private fun askedKey(): String = "one-native-contacts.asked"

    private fun wasAsked(): Boolean =
        context.getSharedPreferences("one-native-contacts", Activity.MODE_PRIVATE)
            .getBoolean(askedKey(), false)

    private fun markAsked() {
        context.getSharedPreferences("one-native-contacts", Activity.MODE_PRIVATE)
            .edit().putBoolean(askedKey(), true).apply()
    }

    private fun readContact(id: String, verb: String): ContactInfo? {
        val row = id.toLongOrNull() ?: return null
        val resolver = context.contentResolver
        var given = ""
        var family = ""
        resolver.query(
            ContentUris.withAppendedId(ContactsContract.Contacts.CONTENT_URI, row),
            arrayOf(ContactsContract.Contacts._ID),
            null,
            null,
            null
        )?.use { cursor ->
            if (!cursor.moveToFirst()) return null
        } ?: return null
        resolver.query(
            ContactsContract.Data.CONTENT_URI,
            arrayOf(
                ContactsContract.Data.MIMETYPE,
                ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME,
                ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME
            ),
            "${ContactsContract.Data.CONTACT_ID}=? AND ${ContactsContract.Data.MIMETYPE}=?",
            arrayOf(
                row.toString(),
                ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
            ),
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                given = cursor.getString(1) ?: ""
                family = cursor.getString(2) ?: ""
            }
        }
        val phones = resolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID}=?",
            arrayOf(row.toString()),
            null
        )?.use { cursor ->
            val out = mutableListOf<String>()
            while (cursor.moveToNext()) out.add(cursor.getString(0) ?: "")
            out
        } ?: mutableListOf()
        val emails = resolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Email.ADDRESS),
            "${ContactsContract.CommonDataKinds.Email.CONTACT_ID}=?",
            arrayOf(row.toString()),
            null
        )?.use { cursor ->
            val out = mutableListOf<String>()
            while (cursor.moveToNext()) out.add(cursor.getString(0) ?: "")
            out
        } ?: mutableListOf()
        val postals = resolver.query(
            ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE,
                ContactsContract.CommonDataKinds.StructuredPostal.LABEL,
                ContactsContract.CommonDataKinds.StructuredPostal.STREET,
                ContactsContract.CommonDataKinds.StructuredPostal.CITY,
                ContactsContract.CommonDataKinds.StructuredPostal.REGION,
                ContactsContract.CommonDataKinds.StructuredPostal.POSTCODE,
                ContactsContract.CommonDataKinds.StructuredPostal.COUNTRY
            ),
            "${ContactsContract.CommonDataKinds.StructuredPostal.CONTACT_ID}=?",
            arrayOf(row.toString()),
            null
        )?.use { cursor ->
            val out = mutableListOf<ContactPostalAddress>()
            while (cursor.moveToNext()) {
                val type = cursor.getInt(0)
                val custom = cursor.getString(1)
                val label = if (type == ContactsContract.CommonDataKinds.StructuredPostal.TYPE_CUSTOM) {
                    custom ?: ""
                } else {
                    ContactsContract.CommonDataKinds.StructuredPostal.getTypeLabel(
                        context.resources, type, custom ?: ""
                    ).toString()
                }
                out.add(
                    ContactPostalAddress(
                        label,
                        cursor.getString(2) ?: "",
                        "",
                        cursor.getString(3) ?: "",
                        "",
                        cursor.getString(4) ?: "",
                        cursor.getString(5) ?: "",
                        cursor.getString(6) ?: "",
                        ""
                    )
                )
            }
            out
        } ?: mutableListOf()
        return ContactInfo(id, given, family, phones.toTypedArray(), emails.toTypedArray(), postals.toTypedArray())
    }

    private fun readContactUri(uri: String, verb: String): ContactInfo {
        val parsed = android.net.Uri.parse(uri)
        val id = context.contentResolver.query(
            parsed,
            arrayOf(ContactsContract.Contacts._ID),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getLong(0).toString() else null
        } ?: throw OneNativeError(E_FETCH, "Contacts.$verb: contact was not found")
        return readContact(id, verb)
            ?: throw OneNativeError(E_FETCH, "Contacts.$verb: contact was not found")
    }

    private fun rawContactIds(contactId: String): List<Long> {
        val row = contactId.toLongOrNull() ?: return emptyList()
        return context.contentResolver.query(
            ContactsContract.RawContacts.CONTENT_URI,
            arrayOf(ContactsContract.RawContacts._ID),
            "${ContactsContract.RawContacts.CONTACT_ID}=?",
            arrayOf(row.toString()),
            null
        )?.use { cursor ->
            val out = mutableListOf<Long>()
            while (cursor.moveToNext()) out.add(cursor.getLong(0))
            out
        } ?: emptyList()
    }

    private fun hasBlank(values: Array<String>): Boolean =
        values.any { it.trim().isEmpty() }

    private fun validAddresses(values: Array<ContactPostalAddressInput>): Boolean =
        values.none { value ->
            val label = value.label?.trim()
            if (label != null && label.isEmpty()) return@none true
            val fields = listOf(
                value.street, value.subLocality, value.city,
                value.subAdministrativeArea, value.state, value.postalCode,
                value.country, value.isoCountryCode
            )
            fields.none { !it.isNullOrBlank() }
        }

    private fun dataInsert(backReference: Int): ContentProviderOperation.Builder =
        ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
            .withValueBackReference(ContactsContract.Data.RAW_CONTACT_ID, backReference)

    private fun ContentProviderOperation.Builder.withPhone(
        value: String,
        type: Int,
        label: String?
    ): ContentProviderOperation.Builder {
        withValue(
            ContactsContract.Data.MIMETYPE,
            ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE
        )
        withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, value)
        withValue(ContactsContract.CommonDataKinds.Phone.TYPE, type)
        if (label != null) {
            withValue(ContactsContract.CommonDataKinds.Phone.LABEL, label)
        }
        return this
    }

    private fun ContentProviderOperation.Builder.withEmail(
        value: String,
        type: Int,
        label: String?
    ): ContentProviderOperation.Builder {
        withValue(
            ContactsContract.Data.MIMETYPE,
            ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE
        )
        withValue(ContactsContract.CommonDataKinds.Email.ADDRESS, value)
        withValue(ContactsContract.CommonDataKinds.Email.TYPE, type)
        if (label != null) {
            withValue(ContactsContract.CommonDataKinds.Email.LABEL, label)
        }
        return this
    }

    private fun ContentProviderOperation.Builder.withPostal(
        value: ContactPostalAddressInput,
        type: Int,
        label: String?
    ): ContentProviderOperation.Builder {
        withValue(
            ContactsContract.Data.MIMETYPE,
            ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE
        )
        withValue(ContactsContract.CommonDataKinds.StructuredPostal.TYPE, type)
        val resolvedLabel = value.label ?: label
        if (type == ContactsContract.CommonDataKinds.StructuredPostal.TYPE_CUSTOM || resolvedLabel != null) {
            withValue(
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE,
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_CUSTOM
            )
            withValue(ContactsContract.CommonDataKinds.StructuredPostal.LABEL, resolvedLabel ?: "")
        }
        withValue(ContactsContract.CommonDataKinds.StructuredPostal.STREET, value.street ?: "")
        withValue(ContactsContract.CommonDataKinds.StructuredPostal.CITY, value.city ?: "")
        withValue(ContactsContract.CommonDataKinds.StructuredPostal.REGION, value.state ?: "")
        withValue(ContactsContract.CommonDataKinds.StructuredPostal.POSTCODE, value.postalCode ?: "")
        withValue(ContactsContract.CommonDataKinds.StructuredPostal.COUNTRY, value.country ?: "")
        return this
    }

    private data class LabeledValue(val rowId: Long, val value: String, val type: Int, val label: String?)

    private fun existingLabeled(rawId: Long, mimeType: String, column: String): MutableList<LabeledValue> {
        val out = mutableListOf<LabeledValue>()
        val typeColumn = when (mimeType) {
            ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE ->
                ContactsContract.CommonDataKinds.Phone.TYPE
            else -> ContactsContract.CommonDataKinds.Email.TYPE
        }
        val labelColumn = when (mimeType) {
            ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE ->
                ContactsContract.CommonDataKinds.Phone.LABEL
            else -> ContactsContract.CommonDataKinds.Email.LABEL
        }
        context.contentResolver.query(
            ContactsContract.Data.CONTENT_URI,
            arrayOf(ContactsContract.Data._ID, column, typeColumn, labelColumn),
            "${ContactsContract.Data.RAW_CONTACT_ID}=? AND ${ContactsContract.Data.MIMETYPE}=?",
            arrayOf(rawId.toString(), mimeType),
            null
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                out.add(LabeledValue(cursor.getLong(0), cursor.getString(1) ?: "", cursor.getInt(2), cursor.getString(3)))
            }
        }
        return out
    }

    private fun replaceLabeled(
        ops: ArrayList<ContentProviderOperation>,
        rawId: Long,
        mimeType: String,
        column: String,
        values: List<String>,
        existing: MutableList<LabeledValue>,
        defaultType: Int
    ) {
        for (row in existing) {
            if (values.none { it == row.value }) {
                ops.add(
                    ContentProviderOperation.newDelete(ContactsContract.Data.CONTENT_URI)
                        .withSelection("${ContactsContract.Data._ID}=?", arrayOf(row.rowId.toString()))
                        .build()
                )
            }
        }
        val remaining = existing.toMutableList()
        for (value in values) {
            val match = remaining.indexOfFirst { it.value == value }
            if (match >= 0) {
                remaining.removeAt(match)
                continue
            }
            val insert = ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawId)
            if (mimeType == ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE) {
                insert.withPhone(value, defaultType, null)
            } else {
                insert.withEmail(value, defaultType, null)
            }
            ops.add(insert.build())
        }
    }

    private fun replacePostals(
        ops: ArrayList<ContentProviderOperation>,
        rawId: Long,
        values: List<ContactPostalAddressInput>
    ) {
        val mime = ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE
        val rows = mutableListOf<Long>()
        context.contentResolver.query(
            ContactsContract.Data.CONTENT_URI,
            arrayOf(
                ContactsContract.Data._ID,
                ContactsContract.CommonDataKinds.StructuredPostal.STREET,
                ContactsContract.CommonDataKinds.StructuredPostal.CITY,
                ContactsContract.CommonDataKinds.StructuredPostal.REGION,
                ContactsContract.CommonDataKinds.StructuredPostal.POSTCODE,
                ContactsContract.CommonDataKinds.StructuredPostal.COUNTRY
            ),
            "${ContactsContract.Data.RAW_CONTACT_ID}=? AND ${ContactsContract.Data.MIMETYPE}=?",
            arrayOf(rawId.toString(), mime),
            null
        )?.use { cursor ->
            while (cursor.moveToNext()) rows.add(cursor.getLong(0))
        }
        for (row in rows) {
            ops.add(
                ContentProviderOperation.newDelete(ContactsContract.Data.CONTENT_URI)
                    .withSelection("${ContactsContract.Data._ID}=?", arrayOf(row.toString()))
                    .build()
            )
        }
        for (value in values) {
            val insert = ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawId)
            insert.withPostal(
                value,
                ContactsContract.CommonDataKinds.StructuredPostal.TYPE_HOME,
                null
            )
            ops.add(insert.build())
        }
    }

    companion object {
        private const val E_MANIFEST = "E_CONTACTS_MANIFEST"
        private const val E_PERMISSION = "E_CONTACTS_PERMISSION"
        private const val E_PICKER = "E_CONTACTS_PICKER"
        private const val E_INPUT = "E_CONTACTS_INPUT"
        private const val E_FETCH = "E_CONTACTS_FETCH"
        private const val E_SAVE = "E_CONTACTS_SAVE"
        private const val E_DELETE = "E_CONTACTS_DELETE"
        private const val E_NOT_FOUND = "E_CONTACTS_NOT_FOUND"
        private const val REQUEST_PICKER = 0x2C01
        private const val REQUEST_PERMISSION = 0x2C02
    }
}
