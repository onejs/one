#!/usr/bin/env python3
"""compile the actual hybrid against bounded JVM boundary doubles; no device proof."""
import argparse
import glob
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[5]
SOURCE = "packages/one/android/src/main/java/com/margelo/nitro/one/HybridOneMapServices.kt"
STUBS = {
    "Context.kt": "package android.content\nclass Context",
    "Looper.kt": "package android.os\nclass Looper { companion object { fun getMainLooper() = Looper() } }\nclass Handler(looper: Looper) { fun post(action: () -> Unit): Boolean { action(); return true } }",
    "Geocoder.kt": r"""package android.location
import android.content.Context
import java.util.Locale
class Address {
 val maxAddressLineIndex = -1
 val featureName: String? = null
 val latitude = 0.0
 val longitude = 0.0
 fun getAddressLine(index: Int): String? = null
 fun hasLatitude() = false
 fun hasLongitude() = false
}
class Geocoder(context: Context, locale: Locale) {
 companion object { var mode = "empty"; fun isPresent() = true }
 private fun result(): List<Address>? = when (mode) {
  "io" -> throw java.io.IOException("geocoder offline")
  "null" -> null
  else -> emptyList()
 }
 fun getFromLocationName(query: String, max: Int) = result()
 fun getFromLocationName(query: String, max: Int, a: Double, b: Double, c: Double, d: Double) = result()
}
""",
    "NitroModules.kt": "package com.margelo.nitro\nobject NitroModules { var applicationContext: android.content.Context? = android.content.Context() }",
    "Promise.kt": r"""package com.margelo.nitro.core
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
class Promise<T> {
 val settlements = AtomicInteger()
 val ready = CountDownLatch(1)
 var value: T? = null
 var error: Throwable? = null
 fun resolve(result: T) { value = result; settlements.incrementAndGet(); ready.countDown() }
 fun reject(failure: Throwable) { error = failure; settlements.incrementAndGet(); ready.countDown() }
 fun await() { check(ready.await(5, TimeUnit.SECONDS)) { "promise did not settle" } }
 companion object { fun <T> rejected(failure: Throwable): Promise<T> = Promise<T>().also { it.reject(failure) } }
}
""",
    "Spec.kt": r"""package com.margelo.nitro.one
import com.margelo.nitro.core.Promise
data class MapCoordinate(val latitude: Double, val longitude: Double)
data class MapPlace(val name: String, val address: String, val coordinate: MapCoordinate)
class MapSuggestion
class MapRoute
enum class MapTransport { WALK }
class OneNativeError(val code: String, message: String): RuntimeException(message)
abstract class HybridOneMapServicesSpec {
 open fun dispose() {}
 abstract fun search(query: String, center: MapCoordinate, radiusMeters: Double): Promise<Array<MapPlace>>
 abstract fun autocomplete(query: String, center: MapCoordinate, radiusMeters: Double): Promise<Array<MapSuggestion>>
 abstract fun resolveSuggestion(id: String): Promise<MapPlace>
 abstract fun directions(origin: MapCoordinate, destination: MapCoordinate, transport: MapTransport): Promise<MapRoute>
}
""",
    "Main.kt": r"""import android.location.Geocoder
import com.margelo.nitro.one.*
fun main() {
 for (mode in listOf("empty", "null", "io", "invalid")) {
  Geocoder.mode = mode
  val hybrid = HybridOneMapServices()
  try {
   val result = hybrid.search(if (mode == "invalid") " " else "oneproof", MapCoordinate(0.0, 0.0), 1000.0)
   result.await()
   check(result.settlements.get() == 1) { "$mode settled ${result.settlements.get()} times" }
   when (mode) {
    "empty", "null" -> check(result.error == null && result.value?.size == 0) { "$mode must resolve empty" }
    "io" -> {
     check((result.error as? OneNativeError)?.code == "E_MAP_SEARCH") { "io must reject E_MAP_SEARCH; value=${result.value?.size} error=${result.error}" }
     check(result.error?.message == "MapServices.search: geocoder offline") { "io message changed" }
    }
    else -> check((result.error as? OneNativeError)?.code == "E_MAP_INPUT") { "validation changed" }
   }
   println("PASS $mode exact-one-settlement")
  } finally { hybrid.dispose() }
 }
}
""",
}

def jar(group, artifact, version):
    found = glob.glob(str(Path.home() / ".gradle/caches/modules-2/files-2.1" / group / artifact / version / "*/*.jar"))
    if len(found) != 1:
        raise RuntimeError(f"requires existing cached {group}:{artifact}:{version}; no downloads")
    return found[0]

parser = argparse.ArgumentParser()
parser.add_argument("--ref", help="compile exact historical source for fail-before control")
args = parser.parse_args()
source = subprocess.check_output(["git", "show", args.ref + ":" + SOURCE], cwd=ROOT) if args.ref else (ROOT / SOURCE).read_bytes()
stdlib = jar("org.jetbrains.kotlin", "kotlin-stdlib", "2.2.0")
compiler = jar("org.jetbrains.kotlin", "kotlin-compiler-embeddable", "2.2.0")
coroutines = jar("org.jetbrains.kotlinx", "kotlinx-coroutines-core-jvm", "1.8.0")
annotations = jar("org.jetbrains", "annotations", "13.0")
with tempfile.TemporaryDirectory(prefix="one-map-contract-") as directory:
    work = Path(directory)
    (work / "HybridOneMapServices.kt").write_bytes(source)
    for name, content in STUBS.items():
        (work / name).write_text(content)
    classes = work / "classes"
    subprocess.run(["java", "-cp", ":".join([compiler, stdlib, coroutines, annotations]), "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "-no-stdlib", "-no-reflect", "-classpath", ":".join([stdlib, annotations]), "-d", str(classes), *map(str, work.glob("*.kt"))], check=True)
    run = subprocess.run(["java", "-cp", ":".join([str(classes), stdlib]), "MainKt"], text=True, capture_output=True)
    print(json.dumps({"source_sha256": hashlib.sha256(source).hexdigest(), "ref": args.ref, "exit": run.returncode, "stdout": run.stdout, "stderr": run.stderr, "limit": "actual hybrid code with deterministic JVM Android/Nitro boundary doubles; no APK/device/provider runtime acceptance"}, indent=2))
    raise SystemExit(run.returncode)
