#!/bin/bash
set -euo pipefail
probe_dir=$(cd "$(dirname "$0")" && pwd)
sdk_dir=${ANDROID_SDK_ROOT:-/Users/n8/Library/Android/sdk}
jdk_dir=${PROBE_JDK:-/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home}
output_dir=${1:?usage: build.sh output-directory [manifest]}
manifest=${2:-$probe_dir/AndroidManifest.xml}
mkdir -p "$output_dir/classes" "$output_dir/dex" "$output_dir/manifest"
cp "$manifest" "$output_dir/manifest/AndroidManifest.xml"
build_tools="$sdk_dir/build-tools/37.0.0"
android_jar="$sdk_dir/platforms/android-37.0/android.jar"
"$jdk_dir/bin/javac" -source 8 -target 8 -classpath "$android_jar" -d "$output_dir/classes" "$probe_dir/ProbeActivity.java"
"$jdk_dir/bin/jar" cf "$output_dir/classes.jar" -C "$output_dir/classes" .
JAVA_HOME="$jdk_dir" "$build_tools/d8" --min-api 30 --lib "$android_jar" --output "$output_dir/dex" "$output_dir/classes.jar"
"$build_tools/aapt" package -f -M "$output_dir/manifest/AndroidManifest.xml" -I "$android_jar" -F "$output_dir/unsigned.apk"
(cd "$output_dir/dex" && zip -q "$output_dir/unsigned.apk" classes.dex)
"$build_tools/zipalign" -f 4 "$output_dir/unsigned.apk" "$output_dir/aligned.apk"
if [ ! -f "$output_dir/probe.jks" ]; then
  "$jdk_dir/bin/keytool" -genkeypair -keystore "$output_dir/probe.jks" -storepass probe-only -keypass probe-only -alias probe -dname CN=SDKProbe -keyalg RSA -validity 30 -noprompt
fi
JAVA_HOME="$jdk_dir" "$build_tools/apksigner" sign --ks "$output_dir/probe.jks" --ks-pass pass:probe-only --out "$output_dir/probe.apk" "$output_dir/aligned.apk"
JAVA_HOME="$jdk_dir" "$build_tools/apksigner" verify "$output_dir/probe.apk"
shasum -a 256 "$probe_dir/ProbeActivity.java" "$manifest" "$android_jar" "$output_dir/probe.apk"
