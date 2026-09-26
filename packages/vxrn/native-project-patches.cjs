// native project patches shared by the prebuild path.
const { createRequire } = require('node:module')
const path = require('node:path')

function hasNitroWebImage(root) {
  const projectRequire = createRequire(path.join(root, 'package.json'))
  try {
    const oneRoot = path.dirname(projectRequire.resolve('one/package.json'))
    projectRequire.resolve('react-native-nitro-web-image/package.json', { paths: [oneRoot] })
    return true
  } catch {
    return false
  }
}

const NITRO_WEB_IMAGE_MARKER = '# [vxrn/one] nitro web image modular header'

function injectNitroWebImageModularHeaderIntoPodfile(podfile) {
  if (podfile.includes(NITRO_WEB_IMAGE_MARKER) ||
    /pod ['"]SDWebImage['"][^\n]*:modular_headers\s*=>\s*true/.test(podfile)) return podfile
  const anchor = /^(\s*)config = use_native_modules!.*$/m
  const match = podfile.match(anchor)
  if (!match) throw new Error('[vxrn] Podfile lost its use_native_modules! anchor')
  const insertAt = match.index + match[0].length
  return podfile.slice(0, insertAt) + '\n' + match[1] + NITRO_WEB_IMAGE_MARKER +
    '\n' + match[1] + "pod 'SDWebImage', :modular_headers => true" + podfile.slice(insertAt)
}

/**
 * RN's fmt pod (11.x) fails to compile under Xcode 26 clang in C++20 mode:
 * "call to consteval function 'fmt::basic_format_string<...>' is not a
 * constant expression" in format-inl.h. Compiling fmt as c++17 with
 * FMT_USE_NONTYPE_TEMPLATE_ARGS=0 sidesteps the consteval path entirely;
 * fmt is an internal folly/react-native dependency so the flags are local
 * to that pod.
 */
const FMT_CXX17_MARKER = '# [vxrn/one] fmt c++17 fix'

function injectFmtCxx17FixIntoPodfile(podfile) {
  if (podfile.includes(FMT_CXX17_MARKER)) {
    return podfile
  }

  const patch = `
    ${FMT_CXX17_MARKER}
    # Xcode 26 clang rejects fmt 11.x FMT_STRING consteval in C++20 mode.
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'

      target.build_configurations.each do |build_config|
        defs = build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        defs = [defs] unless defs.is_a?(Array)
        defs |= ['FMT_USE_NONTYPE_TEMPLATE_ARGS=0']
        build_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        flags = build_config.build_settings['OTHER_CPLUSPLUSFLAGS'] || ['$(inherited)']
        flags = [flags] unless flags.is_a?(Array)
        flags |= ['-std=c++17']
        build_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags
      end
    end
`

  const match = podfile.match(/post_install\s+do\s+\|installer\|/)
  if (!match) {
    console.warn(
      '[vxrn] could not find post_install block in Podfile to inject fmt c++17 fix'
    )
    return podfile
  }

  const insertAt = match.index + match[0].length
  return podfile.slice(0, insertAt) + '\n' + patch + podfile.slice(insertAt)
}

/**
 * RN disables Metro minification for iOS Hermes Release, expecting
 * hermesc -O to handle bytecode optimization. For large One/VxRN bundles
 * hermesc can crash on EAS standard workers. Forcing --minify true makes
 * Metro emit a minified bundle that hermesc consumes — final bytecode is
 * identical, just smaller intermediate input.
 *
 * Skipped on non-Release configurations to keep debug build times sane.
 */
const HERMES_MINIFY_PATCH_MARKER = '# [vxrn/one] minify iOS Hermes Release bundle input'

function injectHermesMinificationPatchIntoPodfile(podfile) {
  if (podfile.includes(HERMES_MINIFY_PATCH_MARKER)) {
    return podfile
  }

  const patch = `
    ${HERMES_MINIFY_PATCH_MARKER}
    # hermesc can OOM/crash on large unminified bundles on EAS standard
    # workers. Pre-minify so hermesc only does bytecode conversion. Only
    # applies in Release.
    installer.aggregate_targets.each do |aggregate_target|
      project = aggregate_target.user_project
      next unless project

      changed = false
      project.targets.each do |target|
        target.shell_script_build_phases.each do |phase|
          next unless phase.name.to_s.include?('Bundle React Native code and images')
          next if phase.shell_script.to_s.include?('${HERMES_MINIFY_PATCH_MARKER}')

          original_script = phase.shell_script
          phase.shell_script = <<~SCRIPT
            ${HERMES_MINIFY_PATCH_MARKER}
            if [ "$CONFIGURATION" = "Release" ]; then
              export EXTRA_PACKAGER_ARGS="\${EXTRA_PACKAGER_ARGS:-} --minify true"
            fi

            #{original_script}
          SCRIPT
          changed = true
        end
      end

      project.save if changed
    end
`

  const match = podfile.match(/post_install\s+do\s+\|installer\|/)
  if (!match) {
    console.warn(
      '[vxrn] could not find post_install block in Podfile to inject Hermes minification patch'
    )
    return podfile
  }

  const insertAt = match.index + match[0].length
  return podfile.slice(0, insertAt) + '\n' + patch + podfile.slice(insertAt)
}

const RNS_SCREENS_GAMMA_MARKER = '# [vxrn/one] enable react-native-screens gamma'

function injectReactNativeScreensGammaIntoPodfile(podfile) {
  if (podfile.includes("ENV['RNS_GAMMA_ENABLED']")) {
    return podfile
  }

  return `${RNS_SCREENS_GAMMA_MARKER}\nENV['RNS_GAMMA_ENABLED'] ||= '1'\n${podfile}`
}

/**
 * Expo's bundle phase defaults to Expo CLI's export:embed command. One routes
 * the React Native bundle command through react-native.config.cjs instead.
 */
function removeExpoDefaultsFromBundleReactNativeShellScript(input) {
  const cliPath = /if \[\[ -z "\$CLI_PATH" \]\]; then[\s\S]*?fi\n?/g
  const bundleCommand = /if \[\[ -z "\$BUNDLE_COMMAND" \]\]; then[\s\S]*?fi\n?/g

  return input.replace(cliPath, '').replace(bundleCommand, '')
}

/**
 * replace android/app/build.gradle's react block with one's generated settings.
 */
function replaceAppBuildGradleReactBlock(appBuildGradleContents) {
  const appBuildGradleContentLines = appBuildGradleContents.split('\n')
  const reactBlockStartIndex = appBuildGradleContentLines.findIndex((l) =>
    l.startsWith('react {')
  )
  const reactBlockEndIndex =
    appBuildGradleContentLines.slice(reactBlockStartIndex).findIndex((l) => l === '}') +
    reactBlockStartIndex

  if (reactBlockStartIndex === -1 || reactBlockEndIndex === -1) {
    console.warn('[vxrn] failed to patch Android app/build.gradle: react block not found')
    return appBuildGradleContents
  }

  return [
    ...appBuildGradleContentLines.slice(0, reactBlockStartIndex),
    ANDROID_APP_BUILD_GRADLE_REACT_BLOCK,
    ...appBuildGradleContentLines.slice(reactBlockEndIndex + 1),
  ].join('\n')
}

// TODO: Get the content of this block from @react-native-community/template (for example, get https://registry.npmjs.org/@react-native-community/template/0.76.6, find the tarball, download it into a tmp dir, extract it, read template/android/app/build.gradle, parse out the react block) to ensure it stays up to date.
// Note that we need to add patches marked with [vxrn/one], not just copy the block from the template as is.
const ANDROID_APP_BUILD_GRADLE_REACT_BLOCK = `
def resolveNodePackage = { packageName ->
    providers.exec {
        workingDir(rootDir)
        commandLine("node", "--print", "require.resolve('" + packageName + "')")
    }.standardOutput.asText.get().trim()
}

def resolveReactNativeDependency = { packageName ->
    providers.exec {
        workingDir(rootDir)
        commandLine("node", "--print", "require('module').createRequire(require.resolve('react-native/package.json')).resolve('" + packageName + "')")
    }.standardOutput.asText.get().trim()
}

react {
    // [vxrn/one] the bundle command should find the entry file automatically,
    // we are setting this to a file that will definitely exist to avoid
    // 'detectEntryFile' (defined in react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/PathUtils.kt)
    // to use a non-existing 'index.js' file as default and make the Android
    // build fail with Gradle error:
    // 'An input file was expected to be present but it doesn't exist.'
    entryFile = file("../../package.json")

    /* Folders */
    //   The root of your project, i.e. where "package.json" lives. Default is '../..'
    // root = file("../../")
    // [vxrn/one] resolve hoisted packages from the generated project instead of assuming
    // the application has its own node_modules directory.
    reactNativeDir = file(resolveNodePackage("react-native/package.json")).parentFile
    codegenDir = file(resolveReactNativeDependency("@react-native/codegen/package.json")).parentFile
    // [vxrn/one] cli.js is not in react-native's exports map since 0.87, so
    // resolve the exported package.json and step to the sibling cli.js on disk
    cliFile = new File(file(resolveNodePackage("react-native/package.json")).parentFile, "cli.js")
    // [vxrn/one] resolve hermesc from the same react-native installation
    hermesCommand = new File(file(resolveReactNativeDependency("hermes-compiler/package.json")).parentFile, "hermesc/%OS-BIN%/hermesc").absolutePath

    /* Variants */
    //   The list of variants to that are debuggable. For those we're going to
    //   skip the bundling of the JS bundle and the assets. By default is just 'debug'.
    //   If you add flavors like lite, prod, etc. you'll have to list your debuggableVariants.
    // debuggableVariants = ["liteDebug", "prodDebug"]

    /* Bundling */
    //   A list containing the node command and its flags. Default is just 'node'.
    // nodeExecutableAndArgs = ["node"]
    //
    //   The command to run when bundling. By default is 'bundle'
    // bundleCommand = "ram-bundle"
    //
    //   The path to the CLI configuration file. Default is empty.
    // bundleConfig = file(../rn-cli.config.js)
    //
    //   The name of the generated asset file containing your JS bundle
    // bundleAssetName = "MyApplication.android.bundle"
    //
    //   The entry file for bundle generation. Default is 'index.android.js' or 'index.js'
    // entryFile = file("../js/MyApplication.android.js")
    //
    //   A list of extra flags to pass to the 'bundle' commands.
    //   See https://github.com/react-native-community/cli/blob/main/docs/commands.md#bundle
    // extraPackagerArgs = []

    /* Hermes Commands */
    //   The hermes compiler command to run. By default it is 'hermesc'
    // hermesCommand = "$rootDir/my-custom-hermesc/bin/hermesc"
    //
    //   The list of flags to pass to the Hermes compiler. By default is "-O", "-output-source-map"
    // hermesFlags = ["-O", "-output-source-map"]

    /* Autolinking */
    autolinkLibrariesWithApp()
}
`.trim()

const SET_CLI_PATH_MARKER = '# [vxrn/one] React Native now defaults CLI_PATH'

/**
 * The bundle phase ends by running React Native's own `scripts/react-native-xcode.sh`
 * through a backtick-wrapped `"$NODE_BINARY" ...` invocation. The patchers below
 * insert their exports right before that line so `react-native-xcode.sh` sees them.
 *
 * templates have used multiple quoting forms for that line:
 *
 *   SDK 57: `"$NODE_BINARY" --print ".../scripts/react-native-xcode.sh"`
 *   SDK 58: "`"$NODE_BINARY" --print ".../scripts/react-native-xcode.sh"`"
 *
 * so match any leading quote characters and re-emit whatever matched. Matching
 * only the exact SDK 57 shape made every patch below a silent no-op on SDK 58.
 */
const BUNDLE_PHASE_RUNNER_ANCHORS = [
  /^[ \t]*["'`]*`"\$NODE_BINARY"/m,
  /^[ \t]*\/bin\/sh -c .*\$REACT_NATIVE_XCODE.*$/m,
]

let warnedMissingBundlePhaseRunnerAnchor = false

function insertBeforeBundlePhaseRunner(input, codeToAdd) {
  for (const anchor of BUNDLE_PHASE_RUNNER_ANCHORS) {
    const patched = input.replace(anchor, (match) => `${codeToAdd}\n\n${match}`)
    if (patched !== input) return patched
  }

  if (!warnedMissingBundlePhaseRunnerAnchor) {
    warnedMissingBundlePhaseRunnerAnchor = true
    console.warn(
      '[vxrn] could not find the `"$NODE_BINARY" .../scripts/react-native-xcode.sh` line in the iOS bundle phase; vxrn bundle phase patches (CLI_PATH, hermesc) were not applied. The React Native template may have changed shape.'
    )
  }
  return input
}

function insertAfterBundlePhaseRunner(input, codeToAdd) {
  for (const anchor of BUNDLE_PHASE_RUNNER_ANCHORS) {
    const match = anchor.exec(input)
    if (!match) continue
    const lineEnd = input.indexOf('\n', match.index + match[0].length)
    const insertAt = lineEnd === -1 ? input.length : lineEnd + 1
    return input.slice(0, insertAt) + codeToAdd + '\n' + input.slice(insertAt)
  }

  if (!warnedMissingBundlePhaseRunnerAnchor) {
    warnedMissingBundlePhaseRunnerAnchor = true
    console.warn(
      '[vxrn] could not find the `"$NODE_BINARY" .../scripts/react-native-xcode.sh` line in the iOS bundle phase; the One.Updates embedded manifest was not applied. The React Native template may have changed shape.'
    )
  }
  return input
}

/**
 * Write the One.Updates embedded manifest beside the release bundle after
 * React Native's bundling runs. The id and timestamp are generated at build
 * time; the runtime version is baked in by prebuild.
 */
const EMBEDDED_UPDATES_MANIFEST_MARKER =
  '# [vxrn/one] the embedded update manifest lands beside the release bundle'

function addEmbeddedUpdatesManifestToBundleReactNativeShellScript(input, runtimeVersion) {
  if (input.includes(EMBEDDED_UPDATES_MANIFEST_MARKER)) {
    return input
  }

  const runtime = String(runtimeVersion).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const codeToAdd = [
    '',
    EMBEDDED_UPDATES_MANIFEST_MARKER,
    'ONE_UPDATES_RESOURCES="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"',
    'if [ -f "$ONE_UPDATES_RESOURCES/main.jsbundle" ]; then',
    `  "\${NODE_BINARY:-node}" -e 'const fs = require("fs"); const manifest = { id: require("crypto").randomUUID(), createdAt: new Date().toISOString(), runtimeVersion: "${runtime}" }; fs.writeFileSync(process.argv[1], JSON.stringify(manifest));' "$ONE_UPDATES_RESOURCES/one-updates-embedded.json"`,
    'fi',
  ].join('\n')

  return insertAfterBundlePhaseRunner(input, codeToAdd)
}

/**
 * React Native v0.76 defaults the CLI_PATH to an internal scripts/bundle.js for iOS (see: https://github.com/facebook/react-native/blob/v0.76.0/packages/react-native/scripts/react-native-xcode.sh#L93), which loads the bundle command directly from `@react-native/community-cli-plugin`, and will ignore the override of the bundle command in `react-native.config.cjs`.
 * We need to set it back to the main CLI endpoint so the override of the bundle command in `react-native.config.cjs` can take effect.
 *
 * Note: The Android build process seems to be using the main CLI endpoint, so we only need to fix iOS.
 */
function addSetCliPathToBundleReactNativeShellScript(input) {
  if (input.includes(SET_CLI_PATH_MARKER)) {
    return input
  }

  const codeToAdd = `
${SET_CLI_PATH_MARKER}
export CLI_PATH="$("\${NODE_BINARY:-node}" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/cli.js'")"
`.trim()

  return insertBeforeBundlePhaseRunner(input, codeToAdd)
}

/**
 * Compile the iOS Release bundle with the hermes-engine pod's OWN hermesc.
 *
 * RN's hermes-engine.podspec sets HERMES_CLI_PATH to the npm `hermes-compiler`
 * package for downloaded-prebuilt Hermes, but a build-time script
 * (replace_hermes_version.js) swaps in a prebuilt Hermes VM that can be a
 * different (newer) version than the pinned hermes-compiler. The hermesc then
 * emits bytecode the VM rejects, and the app dies on launch with
 * "Compiling JS failed: Wrong bytecode version. Expected N but got M".
 *
 * The prebuilt tarball ships a hermesc that matches its own VM at
 * destroot/bin/hermesc, so prefer it. Guarded on the file existing, so builds
 * that compile Hermes from source (no destroot hermesc) are unaffected.
 */
function addPodHermescToBundleReactNativeShellScript(input) {
  if (input.includes('[vxrn/one] use the hermes-engine pod')) {
    return input
  }

  const codeToAdd = `
# [vxrn/one] use the hermes-engine pod's own hermesc so the compiled bytecode matches the prebuilt Hermes VM that RN swaps in at build time (RN points HERMES_CLI_PATH at the npm hermes-compiler, which can be version-skewed -> "Wrong bytecode version" crash on launch). No-op for source builds, which have no destroot hermesc.
if [ -f "\${PODS_ROOT}/hermes-engine/destroot/bin/hermesc" ]; then
  export HERMES_CLI_PATH="\${PODS_ROOT}/hermes-engine/destroot/bin/hermesc"
fi
`.trim()

  return insertBeforeBundlePhaseRunner(input, codeToAdd)
}

/**
 * Ensure patches are applied.
 */
function addDepsPatchToBundleReactNativeShellScript(input) {
  if (input.includes('[vxrn/one] ensure patches are applied')) {
    return input
  }

  return (
    `
# [vxrn/one] ensure patches are applied
cd "$PROJECT_DIR"/..
if [ -f node_modules/.bin/one ]; then
  node_modules/.bin/one patch
elif [ -f node_modules/.bin/vxrn ]; then
  node_modules/.bin/vxrn patch
fi
cd -
` + input
  )
}

/**
 * Ensure patches are applied.
 */
function addDepsPatchToAppBuildGradle(input) {
  if (input.includes('[vxrn/one] ensure patches are applied')) {
    return input
  }

  return (
    input +
    '\n' +
    `
/**
 * [vxrn/one] ensure patches are applied
 * uses ExecOperations injection (Gradle 9 compatible)
 */
interface InjectedExecOps {
    @Inject
    ExecOperations getExecOps()
}

def injected = objects.newInstance(InjectedExecOps)

// capture rootDir as a String at configuration time so the doFirst
// closure below does not reference a Gradle script object at execution
// time, which is unsupported with --configuration-cache
def rootDirString = rootDir.toString()

gradle.taskGraph.whenReady { taskGraph ->
    tasks.named("createBundleReleaseJsAndAssets").configure {
        doFirst {
            def vxrnCli = new File(["node", "--print", "require.resolve('vxrn/package.json')"].execute(null, new File(rootDirString)).text.trim()).getParentFile().getAbsolutePath() + "/run.mjs"
            injected.execOps.exec {
                commandLine "node", vxrnCli, "patch"
            }
        }
    }
}
`.trim()
  )
}

/**
 * Add react-native-screens Android fix to prevent crashes on Activity restarts.
 * This sets up RNScreensFragmentFactory to handle fragment restoration properly.
 *
 * On Android the View state is not persisted consistently across Activity restarts,
 * which can lead to crashes. By setting the fragment factory, we ensure proper
 * handling of fragment state restoration.
 *
 * This fix is required for react-native-screens and is integrated directly into vxrn
 * since we depend on react-native-screens internally.
 *
 * Reference: https://github.com/software-mansion/react-native-screens#android
 */
function addReactNativeScreensFix(input) {
  console.info(`🔨 Ensuring react-native-screens android fix`)

  // Determine if this is Kotlin or Java
  const isKotlin = input.includes('class MainActivity : ReactActivity()')

  // Check if the RNScreensFragmentFactory fix is already applied
  if (input.includes('RNScreensFragmentFactory')) {
    console.info('ℹ️  react-native-screens fix already applied (RNScreensFragmentFactory)')
    return input
  }

  if (isKotlin) {
    // Kotlin version
    // Add necessary imports
    if (!input.includes('import android.os.Bundle')) {
      input = input.replace(/package\s+[\w.]+/, '$&\nimport android.os.Bundle')
    }
    if (
      !input.includes(
        'import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory'
      )
    ) {
      input = input.replace(
        /package\s+[\w.]+/,
        '$&\nimport com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory'
      )
    }

    // Check if onCreate exists and update it, or add new onCreate
    if (input.includes('super.onCreate(')) {
      // Insert fragment factory setup before super.onCreate and ensure savedInstanceState is passed
      input = input.replace(
        /(override\s+fun\s+onCreate\([^)]*\)\s*\{[^}]*?)(super\.onCreate\([^)]*\))/,
        (match, beforeSuper, superCall) => {
          // Add fragment factory before super.onCreate
          const withFactory = `${beforeSuper}// react-native-screens override
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        `
          // Ensure super.onCreate uses savedInstanceState
          const fixedSuperCall = 'super.onCreate(null)'
          return withFactory + fixedSuperCall
        }
      )
      console.info('✅ Updated onCreate with react-native-screens fix in MainActivity.kt')
    } else {
      // Add new onCreate method
      const classMatch = input.match(/class\s+MainActivity\s*:\s*ReactActivity\(\)\s*\{/)
      if (classMatch) {
        const classDeclarationEnd = input.indexOf('{', classMatch.index) + 1

        const onCreateMethod = `

    override fun onCreate(savedInstanceState: Bundle?) {
        // react-native-screens override
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        super.onCreate(null)
    }`

        input =
          input.slice(0, classDeclarationEnd) +
          onCreateMethod +
          input.slice(classDeclarationEnd)
        console.info('✅ Added onCreate with react-native-screens fix to MainActivity.kt')
      }
    }
  } else {
    // Java version
    // Add necessary imports
    if (!input.includes('import android.os.Bundle;')) {
      input = input.replace(/package\s+[\w.]+;/, '$&\nimport android.os.Bundle;')
    }
    if (
      !input.includes(
        'import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory;'
      )
    ) {
      input = input.replace(
        /package\s+[\w.]+;/,
        '$&\nimport com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory;'
      )
    }

    // Check if onCreate exists and update it, or add new onCreate
    if (input.includes('super.onCreate(')) {
      // Insert fragment factory setup before super.onCreate and ensure savedInstanceState is passed
      input = input.replace(
        /(@Override\s*\n?\s*protected\s+void\s+onCreate\([^)]*\)\s*\{[^}]*?)(super\.onCreate\([^)]*\);?)/,
        (match, beforeSuper, superCall) => {
          // Add fragment factory before super.onCreate
          const withFactory = `${beforeSuper}// react-native-screens override
        getSupportFragmentManager().setFragmentFactory(new RNScreensFragmentFactory());
        `
          // Ensure super.onCreate uses savedInstanceSpace (with semicolon for Java)
          const fixedSuperCall = 'super.onCreate(savedInstanceState);'
          return withFactory + fixedSuperCall
        }
      )
      console.info(
        '✅ Updated onCreate with react-native-screens fix in MainActivity.java'
      )
    } else {
      // Add new onCreate method
      const classMatch = input.match(
        /public\s+class\s+MainActivity\s+extends\s+ReactActivity\s*\{/
      )
      if (classMatch) {
        const classDeclarationEnd = input.indexOf('{', classMatch.index) + 1

        const onCreateMethod = `

    // react-native-screens override
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        getSupportFragmentManager().setFragmentFactory(new RNScreensFragmentFactory());
        super.onCreate(savedInstanceState);
    }`

        input =
          input.slice(0, classDeclarationEnd) +
          onCreateMethod +
          input.slice(classDeclarationEnd)
        console.info(
          '✅ Added onCreate with react-native-screens fix to MainActivity.java'
        )
      }
    }
  }

  return input
}

/**
 * swift packages in the app (a directory with Package.swift whose view a
 * react native screen imports) are generated by prebuild as one local pod each
 * under ios/OneSwiftPackages; the Podfile links whatever is there.
 */
const ONE_SWIFT_PACKAGES_MARKER = '# [vxrn/one] swift packages'

function injectOneSwiftPackagesIntoPodfile(podfile) {
  if (podfile.includes(ONE_SWIFT_PACKAGES_MARKER)) return podfile
  const anchor = /^(\s*)config = use_native_modules!.*$/m
  const match = podfile.match(anchor)
  if (!match) throw new Error('[vxrn] Podfile lost its use_native_modules! anchor')
  const indent = match[1]
  const lines = [
    ONE_SWIFT_PACKAGES_MARKER,
    "Dir[File.join(__dir__, 'OneSwiftPackages', '*', '*.podspec')].sort.each do |spec|",
    "  pod File.basename(spec, '.podspec'), :path => File.dirname(spec)",
    'end',
  ].map((line) => indent + line)
  const insertAt = match.index + match[0].length
  return podfile.slice(0, insertAt) + '\n' + lines.join('\n') + podfile.slice(insertAt)
}

// one notifications host entries, written by both one prebuild and
// vxrn/expo-plugin. the ios keys and android class names are read by one's
// native code, so they change together with it.
const ONE_NOTIFICATIONS = {
  enabledInfoPlistKey: 'OneNativeNotificationsEnabled',
  pushInfoPlistKey: 'OneNativeNotificationsPush',
  apsEnvironment: 'development',
  androidPermissions: [
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.RECEIVE_BOOT_COMPLETED',
  ],
  receiver: 'dev.onejs.onenative.OneNativeNotificationsReceiver',
  receiverAction: 'android.intent.action.BOOT_COMPLETED',
  pushService: 'dev.onejs.onenative.OneNativePushService',
  pushServiceAction: 'com.google.firebase.MESSAGING_EVENT',
  pushGradleProperty: 'oneNativePush',
}

module.exports = {
  ONE_NOTIFICATIONS,
  hasNitroWebImage,
  injectNitroWebImageModularHeaderIntoPodfile,
  injectOneSwiftPackagesIntoPodfile,
  addSetCliPathToBundleReactNativeShellScript,
  addPodHermescToBundleReactNativeShellScript,
  addDepsPatchToBundleReactNativeShellScript,
  addEmbeddedUpdatesManifestToBundleReactNativeShellScript,
  injectFmtCxx17FixIntoPodfile,
  injectHermesMinificationPatchIntoPodfile,
  injectReactNativeScreensGammaIntoPodfile,
  removeExpoDefaultsFromBundleReactNativeShellScript,
  replaceAppBuildGradleReactBlock,
  addDepsPatchToAppBuildGradle,
  addReactNativeScreensFix,
}
