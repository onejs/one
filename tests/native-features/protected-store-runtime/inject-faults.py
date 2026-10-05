from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[3]
source = root / 'packages/one/android/src/main/java/com/margelo/nitro/one/HybridOneProtectedStore.kt'
host = root / 'tests/native-features/android'
output = host / 'protected-store-faults/com/margelo/nitro/one/HybridOneProtectedStore.kt'
output.parent.mkdir(parents=True, exist_ok=True)
original = source.read_text()
faults = original.replace('        val pair = generator.generateKeyPair()', '''        val pair = generator.generateKeyPair()
        if (File(context.cacheDir, "protected-keygen-death").exists()) {
            android.os.Process.killProcess(android.os.Process.myPid())
            throw AssertionError("keygen crash boundary did not terminate")
        }''').replace('stream.write(bytes); stream.fd.sync()', '''stream.write(bytes)
            if (File(context.cacheDir, "protected-write-failure").exists()) throw java.io.IOException("injected before atomic commit")
            stream.fd.sync()''').replace('                val dataKey = cipher.doFinal(item.wrapped)', '''                android.util.Log.i("ProtectedControl", "same-cipher=true; operation=${request.operation}")
                val dataKey = cipher.doFinal(item.wrapped)
                try {
                    cipher.doFinal(item.wrapped)
                    throw AssertionError("consumed private cipher reused authentication")
                } catch (expected: java.security.GeneralSecurityException) {
                    android.util.Log.i("ProtectedControl", "consumed-cipher-rejected=${expected.javaClass.simpleName}")
                }
                try {
                    val fresh = Cipher.getInstance(RSA)
                    fresh.init(Cipher.DECRYPT_MODE, privateKey(request), OAEP)
                    fresh.doFinal(item.wrapped)
                    throw AssertionError("fresh private cipher reused authentication")
                } catch (expected: java.security.GeneralSecurityException) {
                    android.util.Log.i("ProtectedControl", "fresh-cipher-rejected=${expected.javaClass.simpleName}")
                }''')
faults = faults.replace('                        worker.execute { authenticated(request, result) }', '''                        Class.forName("dev.vxrn.nativefeatures.tests.ControlReceiver")
                            .getDeclaredMethod("capture", Any::class.java, Any::class.java, BiometricPrompt.AuthenticationResult::class.java)
                            .invoke(null, this@ProtectedStoreOwner, request, result)
                        if (File(context.cacheDir, "protected-retire-success").exists()) {
                            retireOwner(request.owner)
                            android.util.Log.i("ProtectedControl", "retired-before-success")
                        }
                        worker.execute { authenticated(request, result) }''')
assert faults != original
output.write_text(faults)
print(json.dumps({'productionSHA256': hashlib.sha256(original.encode()).hexdigest(), 'faultVariantSHA256': hashlib.sha256(faults.encode()).hexdigest(), 'output': str(output)}, indent=2))
