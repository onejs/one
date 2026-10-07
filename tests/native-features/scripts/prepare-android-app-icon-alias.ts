#!/usr/bin/env bun
// moves the launcher filter to a primary alias and adds TestAlternate.
// the real MainActivity stays enabled during app-icon switching.
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
        android:icon="@android:drawable/ic_menu_compass"
        android:label="@string/app_name">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity-alias>
`

let rendered = readFileSync(manifestPath, 'utf8')
const previousAlternate = rendered.match(/<activity-alias\b[^>]*android:name="\.TestAlternate"[\s\S]*?<\/activity-alias>/)?.[0]
if (previousAlternate) rendered = rendered.replace(previousAlternate, alias.trim())
const main = rendered.match(/<activity\b[^>]*android:name="\.MainActivity"[\s\S]*?<\/activity>/)?.[0]
if (!main) throw new Error('expected MainActivity in app/src/main/AndroidManifest.xml')
const launcher = [...main.matchAll(/<intent-filter>[\s\S]*?<\/intent-filter>/g)]
  .map((match) => match[0])
  .find((filter) => filter.includes('android.intent.action.MAIN') && filter.includes('android.intent.category.LAUNCHER'))
const hasPrimary = rendered.includes('android:name=".Primary"')
if (!launcher && !hasPrimary) throw new Error('expected MainActivity launcher filter or Primary alias')
const primary = `      <activity-alias
        android:name=".Primary"
        android:targetActivity=".MainActivity"
        android:enabled="true"
        android:exported="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity-alias>
`
const host = launcher ? main.replace(launcher, '') : main
const aliases = (hasPrimary ? '' : `\n${primary}`) +
  (rendered.includes('android:name=".TestAlternate"') ? '' : alias)
const updated = rendered.replace(main, host + aliases)
if (updated !== rendered) writeFileSync(manifestPath, updated)
console.log('app-icon launcher aliases prepared')
