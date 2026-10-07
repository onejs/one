import os, pathlib, subprocess, sys, shutil
root = pathlib.Path(os.environ.get('ONE_CRYPTO_SOURCE_ROOT', pathlib.Path(__file__).resolve().parents[4]))
primary = pathlib.Path(os.environ.get('ONE_CRYPTO_DEPENDENCIES_ROOT', root))
probe = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
app = out/'OneCryptoProbe.app'; app.mkdir(exist_ok=True)
modules = primary/'node_modules/react-native-nitro-modules'
headers = out/'include/NitroModules'; headers.mkdir(parents=True,exist_ok=True)
for h in list((modules/'cpp').rglob('*.hpp')) + list((modules/'ios').rglob('*.hpp')):
    dst=headers/h.name
    if not dst.exists(): dst.symlink_to(h)
framework = primary/'tests/native-features/ios/Pods/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/ios-arm64_x86_64-simulator'
hermesinc=primary/'tests/native-features/ios/Pods/hermes-engine/destroot/include'
jsi=primary/'node_modules/react-native/ReactCommon/jsi'
sdk=subprocess.check_output(['xcrun','--sdk','iphonesimulator','--show-sdk-path'],text=True).strip()
subprocess.run([str(primary/'node_modules/.bin/esbuild'),str(probe/'probe.ts'),'--bundle','--platform=node','--format=iife','--target=es2020','--external:react-native-nitro-modules',f'--outfile={app}/probe.js'],check=True)
js=(app/'probe.js').read_text(); (app/'probe.js').write_text('function require(name) { if (name === "react-native-nitro-modules") return { NitroModules: globalThis.NitroModulesProxy }; throw Error(name); }\n'+js)
sources=list((modules/'cpp').rglob('*.cpp'))+list((modules/'ios/platform').glob('*.cpp')) + [modules/'ios/threading/UIThreadDispatcher.cpp']+[jsi/'jsi/jsi.cpp',root/'packages/one/cpp/HybridOneCrypto.cpp',root/'packages/one/nitrogen/generated/shared/c++/HybridOneCryptoSpec.cpp',probe/'main.mm']
cmd=['clang++','-std=c++20','-fobjc-arc','-target','arm64-apple-ios17.0-simulator','-isysroot',sdk,'-I'+str(out/'include'),'-I'+str(headers),'-I'+str(jsi),'-I'+str(hermesinc),'-I'+str(root/'packages/one/cpp'),'-I'+str(root/'packages/one/nitrogen/generated/shared/c++'),'-F'+str(framework),'-framework','hermesvm','-framework','UIKit','-framework','Foundation','-Wl,-rpath,@executable_path/Frameworks',*map(str,sources),'-o',str(app/'OneCryptoProbe')]
subprocess.run(cmd,check=True)
(app/'Info.plist').write_text('''<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>OneCryptoProbe</string><key>CFBundleIdentifier</key><string>dev.onejs.crypto-probe</string><key>CFBundleName</key><string>OneCryptoProbe</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>LSRequiresIPhoneOS</key><true/><key>UILaunchScreen</key><dict/><key>UIApplicationSceneManifest</key><dict><key>UIApplicationSupportsMultipleScenes</key><false/><key>UISceneConfigurations</key><dict><key>UIWindowSceneSessionRoleApplication</key><array><dict><key>UISceneConfigurationName</key><string>default</string><key>UISceneDelegateClassName</key><string>SceneDelegate</string></dict></array></dict></dict></dict></plist>''')
(app/'Frameworks').mkdir(exist_ok=True)
shutil.copytree(framework/'hermesvm.framework',app/'Frameworks/hermesvm.framework',dirs_exist_ok=True)
subprocess.run(['codesign','--force','--sign','-',str(app)],check=True)
print(app)
