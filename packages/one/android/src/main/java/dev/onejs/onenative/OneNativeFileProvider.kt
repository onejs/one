package dev.onejs.onenative

import androidx.core.content.FileProvider

// empty subclass so the manifest merges by our own provider name: providers
// merge by class, so declaring FileProvider itself collides with any other
// library declaring the same class under a different authority.
class OneNativeFileProvider : FileProvider()
