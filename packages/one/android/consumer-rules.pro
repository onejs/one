# kept for apps that build release with r8 (expo sdk 58 turns it on by default).
# nitro autolinking constructs each Hybrid* implementation from c++ by class
# name, so nothing in java references them and r8 would remove them.
-keep class com.margelo.nitro.one.Hybrid* { <init>(); }
# OneNativeSyncJni.cpp resolves this registry and its static methods by name.
-keep class dev.onejs.onenative.OneNativeSyncRegistry { public static *; }
