#!/usr/bin/env bun
// stamps the TestAlternate activity-alias into the prebuilt android test
// app manifest, so the app-icon conformance leg can prove alias switching.
// run after `one prebuild`, before the gradle build. idempotent.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const manifestPath = join(
  import.meta.dir,
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
)

const alias = `      <activity-alias
        android:name=".TestAlternate"
        android:targetActivity=".MainActivity"
        android:enabled="false"
        android:exported="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity-alias>
`

const rendered = readFileSync(manifestPath, 'utf8')
if (rendered.includes('android:name=".TestAlternate"')) {
  console.log('app-icon alias already stamped')
  process.exit(0)
}
const anchor = '      </activity>\n'
if (!rendered.includes(anchor)) {
  throw new Error('expected the MainActivity block in app/src/main/AndroidManifest.xml')
}
writeFileSync(manifestPath, rendered.replace(anchor, `${anchor}${alias}`))
console.log('stamped TestAlternate activity-alias')
