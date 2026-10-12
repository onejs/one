"""Compile the production stopMonitoring method and exercise its ownership decision.

Usage: python3 stop-monitoring-proof.py compiler.json [HybridOneLocation.kt]
compiler.json supplies the installed Kotlin compiler's classpath and stdlib.
Android services, the handler and Nitro Promise are transport stand-ins here;
this probe establishes the update lifetime decision, not OS geofence delivery.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

compiler = json.loads(Path(sys.argv[1]).read_text())
source = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).parents[2] / 'src/main/java/com/margelo/nitro/one/HybridOneLocation.kt'
text = source.read_text()
start = text.index('    override fun stopMonitoring(identifier: String)')
end = text.index('    override fun monitoredRegions()', start)
method = text[start:end]
probe = '''
class Promise<T> { var settled=false; fun resolve(value:T) { settled=true } }
class Context
object NitroModules { val applicationContext:Context?=null }
class Handler { fun post(block:()->Unit) { block() } }
interface Spec { fun stopMonitoring(identifier:String):Promise<Unit> }
class Subject:Spec {
 val mainHandler=Handler(); val monitoredRegions=mutableMapOf("a" to 1,"b" to 2)
 val watches=mutableListOf<Int>(); val positionPromises=mutableListOf<Int>()
 var monitoring=true;var stopCalls=0
 fun stopMonitoringUpdates() { monitoring=false;stopCalls++ }
 fun shouldRunGeofenceService(context:Context)=false
 fun stopLocationService() {}
''' + method + '''
}
fun main() {
 val s=Subject();check(s.stopMonitoring("missing").settled)
 check(s.monitoring && s.stopCalls==0) { "missing ID stopped updates" }
 check(s.stopMonitoring("a").settled)
 check(s.monitoredRegions.keys==setOf("b"))
 check(s.monitoring && s.stopCalls==0) { "remaining region lost updates" }
 check(s.stopMonitoring("b").settled)
 check(!s.monitoring && s.stopCalls==1) { "final region did not release updates" }
 for (owner in listOf("watch", "position")) {
  val held=Subject();held.monitoredRegions.remove("a")
  if (owner=="watch") held.watches.add(1) else held.positionPromises.add(1)
  check(held.stopMonitoring("b").settled)
  check(held.monitoring && held.stopCalls==0) { "$owner lost updates" }
 }
 val inactive=Subject();inactive.monitoring=false
 inactive.stopMonitoring("a");check(inactive.stopCalls==0)
 println("PASS: missing ID, remaining region, final release, watch, pending position, inactive")
}
'''
java = os.environ.get('JAVA_HOME', '')
java = str(Path(java) / 'bin/java') if java else 'java'
with tempfile.TemporaryDirectory(prefix='one-location-stop-') as directory:
    root = Path(directory)
    kotlin = root / 'StopProbe.kt'
    kotlin.write_text(probe)
    classes = root / 'classes'
    subprocess.run([java, '-cp', compiler['classpath'], 'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler', '-no-stdlib', '-no-reflect', '-classpath', compiler['stdlib'], '-d', str(classes), str(kotlin)], check=True)
    subprocess.run([java, '-cp', str(classes) + os.pathsep + compiler['stdlib'], 'StopProbeKt'], check=True)
