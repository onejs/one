const {
  withPlugins,
  withXcodeProject,
  withAppBuildGradle,
  withMainActivity,
} = require('@expo/config-plugins')

const plugin = (config, options = {}) => {
  return withPlugins(config, [
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

        const originalScript = JSON.parse(bundleReactNativeCodeAndImagesBuildPhase.shellScript)
        let patchedScript = originalScript
        patchedScript = removeExpoDefaultsFromBundleReactNativeShellScript(patchedScript)
        patchedScript = addSetCliPathToBundleReactNativeShellScript(patchedScript)
        patchedScript = addDepsPatchToBundleReactNativeShellScript(patchedScript)
        bundleReactNativeCodeAndImagesBuildPhase.shellScript = JSON.stringify(patchedScript)

        return config
      },
    ],
    [
      withAppBuildGradle,
      async (config) => {
        config.modResults.contents = removeExpoDefaultsFromAppBuildGradle(
          config.modResults.contents
        )
        config.modResults.contents = addDepsPatchToAppBuildGradle(config.modResults.contents)
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
  ])
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
  const reactBlockStartIndex = appBuildGradleContentLines.findIndex((l) => l.startsWith('react {'))
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
 */
gradle.taskGraph.whenReady { taskGraph ->
    tasks.named("createBundleReleaseJsAndAssets").configure {
        doFirst {
            def vxrnCli = new File(["node", "--print", "require.resolve('vxrn/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/run.mjs"
            exec {
                commandLine vxrnCli, "patch"
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
          const fixedSuperCall = 'super.onCreate(savedInstanceState)'
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
        super.onCreate(savedInstanceState)
    }`

        input =
          input.slice(0, classDeclarationEnd) + onCreateMethod + input.slice(classDeclarationEnd)
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
      console.info('✅ Updated onCreate with react-native-screens fix in MainActivity.java')
    } else {
      // Add new onCreate method
      const classMatch = input.match(/public\s+class\s+MainActivity\s+extends\s+ReactActivity\s*\{/)
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
          input.slice(0, classDeclarationEnd) + onCreateMethod + input.slice(classDeclarationEnd)
        console.info('✅ Added onCreate with react-native-screens fix to MainActivity.java')
      }
    }
  }

  return input
}

module.exports = plugin
module.exports.addReactNativeScreensFix = addReactNativeScreensFix
