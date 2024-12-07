/**
 * This is a internal plugin for the convenience of VxRN developers to debug the JavaScript bundle.
 * It'll add files into the native code which provides a starting point for debugging the JavaScript bundle with native code.
 * Please consider this as an incomplete tool only for development purposes.
 *
 * To use this plugin, you need to add it (`vxrn/expo-js-native-debugging-plugin`) to the `plugins` array in your `app.json` file, and run prebuild. Then,
 *
 * * For iOS, a `JsNativeDebugging` (`RCTJsNativeDebugging`) native module will be added to the project, under the Libraries group.
 *
 * References:
 * * https://hackmd.io/@z/rn-use-native-modules-without-importing-react-native
 */

const fs = require('node:fs')
const path = require('node:path')
const { withPlugins, withDangerousMod, withXcodeProject } = require('@expo/config-plugins')

const plugin = (config, options = {}) => {
  return withPlugins(config, [
    [
      withDangerousMod,
      [
        'ios',
        async (config) => {
          const { rctJsNativeDebuggingHFilePath, rctJsNativeDebuggingMFilePath } =
            getIosFileNameAndPaths(config)

          const rctJsNativeDebuggingHFileContent = `
//
//  RCTJsNativeDebugging.h
//

#import <React/RCTBridgeModule.h>
@interface RCTJsNativeDebugging : NSObject <RCTBridgeModule>
@end
`.trim()
          const rctJsNativeDebuggingMFileContent = `
//
//  RCTJsNativeDebugging.m
//

#import "RCTJsNativeDebugging.h"

@implementation RCTJsNativeDebugging

RCT_EXPORT_MODULE();

// In JS: globalThis.nativeModuleProxy.JsNativeDebugging.log('message')
RCT_EXPORT_METHOD(log:(NSString *)message)
{
  NSLog(@"%@", message);
}

@end
`.trim()

          if (!fs.existsSync(rctJsNativeDebuggingHFilePath)) {
            fs.writeFileSync(rctJsNativeDebuggingHFilePath, rctJsNativeDebuggingHFileContent)
          }

          if (!fs.existsSync(rctJsNativeDebuggingMFilePath)) {
            fs.writeFileSync(rctJsNativeDebuggingMFilePath, rctJsNativeDebuggingMFileContent)
          }

          return config
        },
      ],
    ],
    [
      withXcodeProject,
      async (config) => {
        const xcodeProject = config.modResults

        const { rctJsNativeDebuggingHFileName, rctJsNativeDebuggingMFileName } =
          getIosFileNameAndPaths(config)

        const librariesGroupKey = xcodeProject.findPBXGroupKey({ name: 'Libraries' })

        if (!xcodeProject.hasFile(rctJsNativeDebuggingHFileName)) {
          xcodeProject.addHeaderFile(rctJsNativeDebuggingHFileName, {}, librariesGroupKey)
        }
        if (!xcodeProject.hasFile(rctJsNativeDebuggingMFileName)) {
          xcodeProject.addSourceFile(rctJsNativeDebuggingMFileName, {}, librariesGroupKey)
        }

        return config
      },
    ],
  ])
}

function getIosFileNameAndPaths(config) {
  const srcPath = path.resolve(config.modRequest.projectRoot, config.modRequest.platformProjectRoot)
  const rctJsNativeDebuggingHFileName = 'RCTJsNativeDebugging.h'
  const rctJsNativeDebuggingMFileName = 'RCTJsNativeDebugging.m'

  const rctJsNativeDebuggingHFilePath = path.resolve(srcPath, rctJsNativeDebuggingHFileName)
  const rctJsNativeDebuggingMFilePath = path.resolve(srcPath, rctJsNativeDebuggingMFileName)

  return {
    rctJsNativeDebuggingHFileName,
    rctJsNativeDebuggingMFileName,
    rctJsNativeDebuggingHFilePath,
    rctJsNativeDebuggingMFilePath,
  }
}

module.exports = plugin
