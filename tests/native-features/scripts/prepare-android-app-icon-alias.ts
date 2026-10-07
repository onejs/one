#!/usr/bin/env bun
// moves the launcher filter to a primary alias and adds TestAlternate.
// the real MainActivity stays enabled during app-icon switching.
// run after `one prebuild`, before the gradle build. idempotent.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
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
        android:targetActivity=".AppIconLauncherActivity"
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

const original = readFileSync(manifestPath, 'utf8')
let rendered = original
const previousAlternate = rendered.match(/<activity-alias\b[^>]*android:name="\.TestAlternate"[\s\S]*?<\/activity-alias>/)?.[0]
if (previousAlternate) rendered = rendered.replace(previousAlternate, alias.trim())
const main = rendered.match(/<activity\b[^>]*android:name="\.MainActivity"[\s\S]*?<\/activity>/)?.[0]
if (!main) throw new Error('expected MainActivity in app/src/main/AndroidManifest.xml')
const launcher = [...main.matchAll(/<intent-filter>[\s\S]*?<\/intent-filter>/g)]
  .map((match) => match[0])
  .find((filter) => filter.includes('android.intent.action.MAIN') && filter.includes('android.intent.category.LAUNCHER'))
const previousPrimary = rendered.match(/<activity-alias\b[^>]*android:name="\.Primary"[\s\S]*?<\/activity-alias>/)?.[0]
const hasPrimary = !!previousPrimary
if (!launcher && !hasPrimary) throw new Error('expected MainActivity launcher filter or Primary alias')
const primary = `      <activity-alias
        android:name=".Primary"
        android:targetActivity=".AppIconLauncherActivity"
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
if (previousPrimary) rendered = rendered.replace(previousPrimary, primary.trim())
const forwarder = `      <activity
        android:name=".AppIconLauncherActivity"
        android:exported="false"
        android:taskAffinity=""
        android:excludeFromRecents="true"
        android:theme="@android:style/Theme.NoDisplay" />
`
const previousForwarder = rendered.match(/<activity\b[^>]*android:name="\.AppIconLauncherActivity"[^>]*\/>/)?.[0]
if (previousForwarder) rendered = rendered.replace(previousForwarder, forwarder.trim())
const host = (launcher ? main.replace(launcher, '') : main) +
  (rendered.includes('android:name=".AppIconLauncherActivity"') ? '' : `\n${forwarder}`)
const aliases = (hasPrimary ? '' : `\n${primary}`) +
  (rendered.includes('android:name=".TestAlternate"') ? '' : alias)
const updated = rendered.replace(main, host + aliases)
if (updated !== original) writeFileSync(manifestPath, updated)
const appRoot = join(import.meta.dir, '..', 'android', 'app')
const namespace = readFileSync(join(appRoot, 'build.gradle'), 'utf8')
  .match(/namespace\s+["']([^"']+)["']/)?.[1]
if (!namespace) throw new Error('expected fixture Android namespace')
const packageRoot = join(appRoot, 'src', 'main', 'java', ...namespace.split('.'))
mkdirSync(packageRoot, { recursive: true })
const forwarderPath = join(packageRoot, 'AppIconLauncherActivity.kt')
const forwarderSource = `package ${namespace}

import android.app.Activity
import android.content.Intent
import android.os.Bundle

// launcher aliases finish before react native mounts in the permanent host.
class AppIconLauncherActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startActivity(Intent(intent).setClass(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP))
        finish()
    }
}
`
if (!existsSync(forwarderPath) || readFileSync(forwarderPath, 'utf8') !== forwarderSource) {
  writeFileSync(forwarderPath, forwarderSource)
}
console.log('app-icon launcher aliases prepared')
