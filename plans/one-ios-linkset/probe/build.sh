#!/bin/zsh
# usage: build.sh <name> <flags...> ; builds app <name>.app with bundle id dev.probe.<name>
name=$1; shift
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
rm -rf $name.app; mkdir $name.app
xcrun clang -target arm64-apple-ios17.0-simulator -isysroot $SDK -fobjc-arc main.m -o $name.app/probe "$@" -Wl,-w 2>&1 | grep -v warning
sed "s/dev.probe.app/dev.probe.$name/" Info.plist > $name.app/Info.plist
codesign -f -s - $name.app
