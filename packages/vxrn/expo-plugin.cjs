const {
  withPlugins,
  withXcodeProject,
  withAppBuildGradle,
  withMainActivity,
  withDangerousMod,
} = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

function getPodfilePropsOptOut(propsPath, key) {
  if (!fs.existsSync(propsPath)) return false
  try {
    const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'))
    return props[key] === 'true'
  } catch {
    return false
  }
}

const plugin = (config, options = {}) => {
  return withPlugins(config, [
    // auto-inject swift 6 workaround for expo-modules-core into Podfile (version-gated, opt-out-able)
    [
      withDangerousMod,
      [
        'ios',
        async (config) => {
          const iosRoot = config.modRequest.platformProjectRoot
          const podfilePath = path.join(iosRoot, 'Podfile')
          if (!fs.existsSync(podfilePath)) return config

          // opt-out: set "one.disableSwift6Workaround": "true" in Podfile.properties.json
          const propsPath = path.join(iosRoot, 'Podfile.properties.json')
          if (fs.existsSync(propsPath)) {
            try {
              const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'))
              if (props['one.disableSwift6Workaround'] === 'true') {
                console.info(
                  '[vxrn] swift 6 workaround disabled via Podfile.properties.json'
                )
                return config
              }
            } catch {}
          }

          // version-gate: only needed for expo-modules-core <56
          const emcVersion = getExpoModulesCoreVersion(config.modRequest.projectRoot)
          if (emcVersion && semverMajor(emcVersion) >= 56) {
            console.info(
              `[vxrn] expo-modules-core@${emcVersion} — swift 6 workaround not needed, skipping`
            )
            return config
          }

          let podfile = fs.readFileSync(podfilePath, 'utf8')
          if (podfile.includes('SWIFT_STRICT_CONCURRENCY')) {
            return config
          }

          podfile = injectSwift6WorkaroundIntoPodfile(podfile)
          fs.writeFileSync(podfilePath, podfile, 'utf8')
          console.info(
            `[vxrn] applied swift 6 workaround for expo-modules-core@${emcVersion || '?'} (expo/expo#43199)\n` +
              `       to disable: set "one.disableSwift6Workaround": "true" in ios/Podfile.properties.json`
          )
          return config
        },
      ],
    ],
    [
      withXcodeProject,
      async (config) => {
        const xcodeProject = config.modResults

        const bundleReactNativeCodeAndImagesBuildPhase = xcodeProject.buildPhaseObject(
          'PBXShellScriptBuildPhase',
          'Bundle React Native code and images'
        )

        if (!bundleReactNativeCodeAndImagesBuildPhase) {
          return config
        }

        const originalScript = JSON.parse(
          bundleReactNativeCodeAndImagesBuildPhase.shellScript
        )
        let patchedScript = originalScript
        patchedScript = removeExpoDefaultsFromBundleReactNativeShellScript(patchedScript)
        patchedScript = addSetCliPathToBundleReactNativeShellScript(patchedScript)
        patchedScript = addDepsPatchToBundleReactNativeShellScript(patchedScript)
        bundleReactNativeCodeAndImagesBuildPhase.shellScript =
          JSON.stringify(patchedScript)

        return config
      },
    ],
    [
      withAppBuildGradle,
      async (config) => {
        config.modResults.contents = removeExpoDefaultsFromAppBuildGradle(
          config.modResults.contents
        )
        config.modResults.contents = addDepsPatchToAppBuildGradle(
          config.modResults.contents
        )
        return config
      },
    ],
    [
      withMainActivity,
      async (config) => {
        config.modResults.contents = addReactNativeScreensFix(config.modResults.contents)
        return config
      },
    ],
    // iOS Hermes Release: hermesc can crash on large unminified bundles.
    // Force Metro to pre-minify so hermesc only does bytecode conversion.
    [
      withDangerousMod,
      [
        'ios',
        async (config) => {
          const iosRoot = config.modRequest.platformProjectRoot
          const podfilePath = path.join(iosRoot, 'Podfile')
          if (!fs.existsSync(podfilePath)) return config

          const propsPath = path.join(iosRoot, 'Podfile.properties.json')
          if (getPodfilePropsOptOut(propsPath, 'one.disableHermesMinification')) {
            return config
          }

          const podfile = fs.readFileSync(podfilePath, 'utf8')
          const next = injectHermesMinificationPatchIntoPodfile(podfile)
          if (next !== podfile) {
            fs.writeFileSync(podfilePath, next, 'utf8')
            console.info(
              '[vxrn] patched Podfile to minify iOS Hermes Release bundle input\n' +
                '       to disable: set "one.disableHermesMinification": "true" in ios/Podfile.properties.json'
            )
          }
          return config
        },
      ],
    ],
    // iOS expo-updates: the EXUpdates pod's "Generate updates resources for
    // expo-updates" build phase invokes Expo Metro directly to bundle the JS
    // entry into app.manifest. Under One/VxRN, release bundling goes through
    // the react-native CLI override (so One's router transforms are wired),
    // and Expo Metro doesn't see those transforms — it fails to resolve the
    // entry on monorepos or chokes on `one/metro-entry-ctx.js`. Replace that
    // phase with one that writes a minimal embedded manifest and sets
    // SKIP_BUNDLING=1 so the original script's bundle step is short-circuited
    // while its fingerprint/resource side-effects still run.
    [
      withDangerousMod,
      [
        'ios',
        async (config) => {
          const iosRoot = config.modRequest.platformProjectRoot
          const podfilePath = path.join(iosRoot, 'Podfile')
          if (!fs.existsSync(podfilePath)) return config

          const propsPath = path.join(iosRoot, 'Podfile.properties.json')
          if (
            getPodfilePropsOptOut(propsPath, 'one.disableExpoUpdatesIosShellScriptPatch')
          ) {
            return config
          }

          // default: generate a real EXUpdates manifest so project-local
          // require()'d assets resolve at runtime. opt-out for callers who
          // need the legacy empty-placeholder behavior (e.g. apps without
          // expo-updates fully wired or with very large bundles where the
          // extra Metro invocation in the build phase is unacceptable).
          const useEmptyManifest = getPodfilePropsOptOut(
            propsPath,
            'one.useEmptyExpoUpdatesManifest'
          )

          const podfile = fs.readFileSync(podfilePath, 'utf8')
          const next = injectExpoUpdatesIosResourcesPatchIntoPodfile(podfile, {
            generateRealManifest: !useEmptyManifest,
          })
          if (next !== podfile) {
            fs.writeFileSync(podfilePath, next, 'utf8')
            console.info(
              useEmptyManifest
                ? '[vxrn] patched Podfile to write empty EXUpdates manifest (legacy mode)\n' +
                  '       to switch to real-manifest mode: remove "one.useEmptyExpoUpdatesManifest" from ios/Podfile.properties.json'
                : '[vxrn] patched Podfile to generate real EXUpdates manifest\n' +
                  '       to fall back to empty placeholder: set "one.useEmptyExpoUpdatesManifest": "true" in ios/Podfile.properties.json\n' +
                  '       to disable patch entirely: set "one.disableExpoUpdatesIosShellScriptPatch": "true" in ios/Podfile.properties.json'
            )
          }
          return config
        },
      ],
    ],
  ])
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

/**
 * The Expo templates defaults the `CLI_PATH` and `BUNDLE_COMMAND` environment variables to use Expo CLI with the `export:embed` command.
 *
 * But in a VxRN project, users should be using `react-native.config.[c]?js` to override the `react-native bundle` command to use vxrn. So we should remove these Expo defaults, so that react-native-xcode.sh will use its default `react-native bundle` command.
 *
 * This is what we expect to be removed:
 *
 * ```sh
 * if [[ -z "$CLI_PATH" ]]; then
 *   # Use Expo CLI
 *   export CLI_PATH="$("$NODE_BINARY" --print "require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })")"
 * fi
 * if [[ -z "$BUNDLE_COMMAND" ]]; then
 *   # Default Expo CLI command for bundling
 *   export BUNDLE_COMMAND="export:embed"
 * fi
 * ```
 */
function removeExpoDefaultsFromBundleReactNativeShellScript(input) {
  // Regular expression to match the CLI_PATH block
  const cliPathRegex = /if \[\[ -z "\$CLI_PATH" \]\]; then[\s\S]*?fi\n?/g
  // Regular expression to match the BUNDLE_COMMAND block
  const bundleCommandRegex = /if \[\[ -z "\$BUNDLE_COMMAND" \]\]; then[\s\S]*?fi\n?/g

  // Remove both sections from the input string
  return input.replace(cliPathRegex, '').replace(bundleCommandRegex, '')
}

/**
 * Modify android/app/build.gradle to remove Expo defaults so it won't force the use of Expo CLI.
 */
function removeExpoDefaultsFromAppBuildGradle(appBuildGradleContents) {
  const appBuildGradleContentLines = appBuildGradleContents.split('\n')
  const reactBlockStartIndex = appBuildGradleContentLines.findIndex((l) =>
    l.startsWith('react {')
  )
  const reactBlockEndIndex =
    appBuildGradleContentLines.slice(reactBlockStartIndex).findIndex((l) => l === '}') +
    reactBlockStartIndex

  if (reactBlockStartIndex === -1 || reactBlockEndIndex === -1) {
    console.warn(
      '[vxrn/expo-plugin] failed to patch Android app/build.gradle: react block not found'
    )
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
    //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
    // reactNativeDir = file("../../node_modules/react-native")
    //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
    // codegenDir = file("../../node_modules/@react-native/codegen")
    //   The cli.js file which is the React Native CLI entrypoint. Default is ../../node_modules/react-native/cli.js
    // cliFile = file("../../node_modules/react-native/cli.js")

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

/**
 * React Native v0.76 defaults the CLI_PATH to an internal scripts/bundle.js for iOS (see: https://github.com/facebook/react-native/blob/v0.76.0/packages/react-native/scripts/react-native-xcode.sh#L93), which loads the bundle command directly from `@react-native/community-cli-plugin`, and will ignore the override of the bundle command in `react-native.config.cjs`.
 * We need to set it back to the main CLI endpoint so the override of the bundle command in `react-native.config.cjs` can take effect.
 *
 * Note: The Android build process seems to be using the main CLI endpoint, so we only need to fix iOS.
 */
function addSetCliPathToBundleReactNativeShellScript(input) {
  if (input.includes('CLI_PATH="')) {
    return input
  }

  const codeToAdd = `
# [vxrn/one] React Native now defaults CLI_PATH to scripts/bundle.js, which loads the bundle command directly from @react-native/community-cli-plugin, we need to set it back to the main CLI endpoint so the override of the bundle command in react-native.config.cjs can take effect
export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/cli.js'")"
`.trim()

  return input.replace(/^`"\$NODE_BINARY"/m, codeToAdd + '\n\n' + '`"$NODE_BINARY"')
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

gradle.taskGraph.whenReady { taskGraph ->
    tasks.named("createBundleReleaseJsAndAssets").configure {
        doFirst {
            def vxrnCli = new File(["node", "--print", "require.resolve('vxrn/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/run.mjs"
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

function getExpoModulesCoreVersion(projectRoot) {
  try {
    const pkgPath = require.resolve('expo-modules-core/package.json', {
      paths: [projectRoot],
    })
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
  } catch {
    return null
  }
}

function semverMajor(version) {
  const match = version.match(/^(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

/**
 * Inject the Swift 6 workaround for expo-modules-core into a Podfile's post_install block.
 *
 * expo-modules-core 55.x uses Swift 6 @MainActor conformance syntax (SE-0470) but has
 * strict concurrency errors. We keep Swift 6 but relax concurrency checking.
 *
 * only applied when expo-modules-core <56. users can opt out by setting
 * "one.disableSwift6Workaround": "true" in ios/Podfile.properties.json.
 *
 * tracking: expo/expo#43199, expo/expo#42525
 */
function injectSwift6WorkaroundIntoPodfile(podfile) {
  const workaround = `
    # [vxrn/one] workaround: expo-modules-core 55.x requires Swift 6 mode with isolated
    # conformances (SE-0470) for @MainActor in protocol conformance syntax.
    # SWIFT_STRICT_CONCURRENCY=minimal suppresses concurrency warnings/errors.
    # tracking: expo/expo#43199, expo/expo#42525
    installer.pods_project.targets.each do |target|
      if target.name == 'ExpoModulesCore'
        target.build_configurations.each do |build_config|
          build_config.build_settings['SWIFT_VERSION'] = '6'
          build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
          flags = build_config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
          unless flags.include?('IsolatedConformances')
            build_config.build_settings['OTHER_SWIFT_FLAGS'] = "#{flags} -enable-upcoming-feature IsolatedConformances"
          end
        end
      end
      # workaround: ContextMenuAuxiliaryPreview uses deprecated transform: .default
      # which is an error in Xcode 26 / Swift 6.2 strict mode.
      if target.name == 'ContextMenuAuxiliaryPreview'
        target.build_configurations.each do |build_config|
          build_config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          build_config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        end
      end
    end
`

  // inject right after `post_install do |installer|`
  const postInstallMatch = podfile.match(/post_install\s+do\s+\|installer\|/)
  if (postInstallMatch) {
    const insertPos = postInstallMatch.index + postInstallMatch[0].length
    return podfile.slice(0, insertPos) + '\n' + workaround + podfile.slice(insertPos)
  }

  // if no post_install found, warn
  console.warn(
    '[vxrn/expo-plugin] could not find post_install block in Podfile to inject Swift 6 workaround.\n' +
      'You may need to manually add the workaround. See: https://onestack.dev/docs/guides-ios-native'
  )
  return podfile
}

/**
 * Replace the EXUpdates pod's "Generate updates resources for expo-updates"
 * Xcode build phase. Two modes:
 *
 *  - Default (`generateRealManifest=true`): run Expo's real
 *    `create-updates-resources-ios.sh` with `EXPO_NO_METRO_WORKSPACE_ROOT=1`
 *    so the generated `app.manifest`'s `nsBundleDir`/`nsBundleFilename`
 *    entries match the asset paths vxrn's iOS bundler writes into the
 *    `.app`. expo-asset's runtime transformer then resolves project-local
 *    `require()`'d assets to real local file URIs. For this to work end to
 *    end the app's Metro config also needs to pin `server.unstable_serverRoot`
 *    to `projectRoot` for release-shaped native bundles, otherwise vxrn
 *    writes assets at workspace-rooted paths while the manifest points at
 *    project-rooted paths and the mismatch leaves project-local images
 *    blank (same outcome as legacy mode below, but with no build-time
 *    regression). `node_modules` assets resolve correctly either way.
 *
 *  - Legacy (`generateRealManifest=false`): write a minimal empty
 *    `{ assets: [] }` app.manifest and run the original script with
 *    SKIP_BUNDLING=1 so only its fingerprint/resource side-effects fire.
 *    Faster (no extra Metro server startup in the build phase), but every
 *    project-local `require()`'d asset resolves to `uri:""` at runtime.
 *    Only choose this if you have no project-local assets, or you have a
 *    JS-side onError fallback for every image, or the extra Metro
 *    invocation in the build phase is unacceptable.
 *
 * Disable the patch entirely: set
 * `"one.disableExpoUpdatesIosShellScriptPatch": "true"` in
 * `ios/Podfile.properties.json`. The upstream script will then run
 * untouched, which on most pnpm monorepos fails to resolve the One entry
 * file and aborts the build.
 *
 * Opt into the legacy empty-placeholder mode: set
 * `"one.useEmptyExpoUpdatesManifest": "true"` in
 * `ios/Podfile.properties.json`.
 *
 * See the "Monorepo asset resolution" section of the OTA Updates docs for
 * the full picture (server-root pinning + this manifest mode together).
 */
// Preserved verbatim so existing patched Podfiles re-trigger the idempotency
// check on next pod install instead of getting the patch injected twice.
const EXPO_UPDATES_METRO_SKIP_MARKER =
  '# [vxrn/one] skip expo-updates Expo Metro for embedded manifest'

function injectExpoUpdatesIosResourcesPatchIntoPodfile(podfile, options = {}) {
  if (podfile.includes(EXPO_UPDATES_METRO_SKIP_MARKER)) {
    return podfile
  }

  // default to real-manifest mode. legacy empty-placeholder mode is only
  // produced when the caller explicitly passes generateRealManifest: false.
  const generateRealManifest = options.generateRealManifest !== false

  // shell snippet that produces app.manifest before the upstream script runs.
  // either an empty placeholder + SKIP_BUNDLING=1 (default), or a real manifest
  // gated on EXPO_NO_METRO_WORKSPACE_ROOT so Expo Metro can resolve the entry.
  const prelude = generateRealManifest
    ? `          # [vxrn/one] opt-in: generate real EXUpdates manifest. requires
          # the app's Metro config to pin server.unstable_serverRoot to the
          # project root for release-shaped native bundles; otherwise asset
          # paths in the manifest won't match what vxrn writes into the .app.
          export EXPO_NO_METRO_WORKSPACE_ROOT=1`
    : `          # default: write an empty manifest and skip the bundle step.
          # project-local require()'d assets will resolve to uri:"" at runtime.
          # set "one.generateExpoUpdatesManifest": "true" in
          # ios/Podfile.properties.json to switch to real-manifest mode.
          "\${NODE_BINARY:-node}" -e "const c=require('node:crypto');const f=require('node:fs');f.writeFileSync(process.argv[1],JSON.stringify({id:c.randomUUID(),commitTime:Date.now(),assets:[]}))" "$RESOURCE_DEST/app.manifest"
          export SKIP_BUNDLING=1`

  const patch = `
    ${EXPO_UPDATES_METRO_SKIP_MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'EXUpdates'

      target.shell_script_build_phases.each do |phase|
        next unless phase.name.to_s.include?('Generate updates resources for expo-updates')
        next if phase.shell_script.to_s.include?('${EXPO_UPDATES_METRO_SKIP_MARKER}')

        original_script = phase.shell_script
        phase.shell_script = <<~SCRIPT
          ${EXPO_UPDATES_METRO_SKIP_MARKER}
          set -eo pipefail

          RESOURCE_BUNDLE_NAME="EXUpdates.bundle"
          DEST="$CONFIGURATION_BUILD_DIR"

          if [ "$BUNDLE_FORMAT" = "shallow" ]; then
            RESOURCE_DEST="$DEST/$RESOURCE_BUNDLE_NAME"
          elif [ "$BUNDLE_FORMAT" = "deep" ]; then
            RESOURCE_DEST="$DEST/$RESOURCE_BUNDLE_NAME/Contents/Resources"
          else
            echo "[vxrn/one] expo-updates patch: unsupported BUNDLE_FORMAT='$BUNDLE_FORMAT'" >&2
            exit 1
          fi

          mkdir -p "$RESOURCE_DEST"

${prelude}

          #{original_script}
        SCRIPT
      end
    end
`

  const match = podfile.match(/post_install\s+do\s+\|installer\|/)
  if (!match) {
    console.warn(
      '[vxrn] could not find post_install block in Podfile to inject expo-updates iOS resources patch'
    )
    return podfile
  }

  const insertAt = match.index + match[0].length
  return podfile.slice(0, insertAt) + '\n' + patch + podfile.slice(insertAt)
}

module.exports = plugin
module.exports.addReactNativeScreensFix = addReactNativeScreensFix
module.exports.injectSwift6WorkaroundIntoPodfile = injectSwift6WorkaroundIntoPodfile
module.exports.injectHermesMinificationPatchIntoPodfile =
  injectHermesMinificationPatchIntoPodfile
module.exports.injectExpoUpdatesIosResourcesPatchIntoPodfile =
  injectExpoUpdatesIosResourcesPatchIntoPodfile
module.exports.HERMES_MINIFY_PATCH_MARKER = HERMES_MINIFY_PATCH_MARKER
module.exports.EXPO_UPDATES_METRO_SKIP_MARKER = EXPO_UPDATES_METRO_SKIP_MARKER
