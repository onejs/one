from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[3]
host = root / 'tests/native-features/android'
manifest = host / 'app/src/main/AndroidManifest.xml'
text = manifest.read_text()
if 'android.permission.USE_BIOMETRIC' not in text:
    text = text.replace('<application', '<uses-permission android:name="android.permission.USE_BIOMETRIC" />\n    <application', 1)
if '.ControlReceiver' not in text:
    text = text.replace('</application>', '<receiver android:name=".ControlReceiver" android:exported="true" />\n    </application>')
manifest.write_text(text)
package = host / 'app/src/main/java/dev/vxrn/nativefeatures/tests'
application = package / 'MainApplication.kt'
text = application.read_text().replace('import com.margelo.nitro.one.OneUpdatesReactHost.getDefaultReactHost', 'import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost')
if 'jsMainModulePath' not in text:
    text = text.replace('      context = applicationContext,', '      context = applicationContext,\n      jsMainModulePath = "protected-store-runtime/entry",')
application.write_text(text)
shutil.copyfile(Path(__file__).parent / 'ControlReceiver.kt', package / 'ControlReceiver.kt')
print('prepared the generated One/Nitro proof host')
