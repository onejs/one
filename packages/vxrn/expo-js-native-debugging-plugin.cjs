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
const {
  withPlugins,
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins')

const plugin = (config, options = {}) => {
  return withPlugins(config, [
    [
      withDangerousMod,
      [
        'ios',
        async (config) => {
          const srcPath = path.resolve(
            config.modRequest.projectRoot,
            config.modRequest.platformProjectRoot
          )

          for (const [fileName, fileContent] of Object.entries(IOS_FILES)) {
            const filePath = path.resolve(srcPath, fileName)
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, fileContent)
            }
          }

          return config
        },
      ],
    ],
    [
      withXcodeProject,
      async (config) => {
        const xcodeProject = config.modResults

        const librariesGroupKey = xcodeProject.findPBXGroupKey({ name: 'Libraries' })

        for (const fileName in IOS_FILES) {
          if (!xcodeProject.hasFile(fileName)) {
            if (fileName.endsWith('.h')) {
              xcodeProject.addHeaderFile(fileName, {}, librariesGroupKey)
            } else {
              xcodeProject.addSourceFile(fileName, {}, librariesGroupKey)
            }
          }
        }

        return config
      },
    ],
  ])
}

const IOS_FILES = {
  'RCTJsNativeDebugging.h': `
//
//  RCTJsNativeDebugging.h
//

#import <React/RCTBridgeModule.h>
@interface RCTJsNativeDebugging : NSObject <RCTBridgeModule>
@end
  `.trim(),
  'RCTJsNativeDebugging.m': `
//
//  RCTJsNativeDebugging.m
//

#import "RCTJsNativeDebugging.h"

@implementation RCTJsNativeDebugging

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(log:(NSString *)message)
{
  NSLog(@"%@", message);
}

@end
  `.trim(),

  'JSIDebuggingModule.h': `
//
//  JSIDebuggingModule.h
//

#import <React/RCTBridgeModule.h>

@interface JSIDebuggingModule : NSObject <RCTBridgeModule>;

@property (nonatomic, assign) BOOL setBridgeOnMainQueue;

@end
  `.trim(),

  'JSIDebuggingModule.mm': `
//
//  JSIDebuggingModule.mm
//

#import "JSIDebuggingModule.h"
#import <React/RCTBridge+Private.h>
#import <React/RCTUtils.h>
#import <jsi/jsi.h>
#import "jsi_debugging.h"

@implementation JSIDebuggingModule

@synthesize bridge = _bridge;
@synthesize methodQueue = _methodQueue;

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup {

    return YES;
}

- (void)setBridge:(RCTBridge *)bridge {
    _bridge = bridge;
    _setBridgeOnMainQueue = RCTIsMainQueue();
    [self installLibrary];
}

- (void)installLibrary {

    RCTCxxBridge *cxxBridge = (RCTCxxBridge *)self.bridge;

    if (cxxBridge.runtime) {
      jsi_debugging::install(*(facebook::jsi::Runtime *)cxxBridge.runtime);
    }
}

@end
  `.trim(),

  'jsi_debugging.h': `
//
//  jsi_debugging.h
//

#include <jsi/jsi.h>

using namespace facebook::jsi;

#ifndef JSIDebugging_h
#define JSIDebugging_h

namespace jsi_debugging {
  void install(Runtime & jsiRuntime);
}

#endif /* JSIDebugging_h */
  `.trim(),

  'jsi_debugging.cpp': `
//
//  jsi_debugging.cpp
//

#include "jsi_debugging.h"
#include <jsi/jsi.h>
#include <string>
#include <iostream>
#include <sstream>

using namespace facebook::jsi;
using namespace std;

namespace jsi_debugging {
    std::string jsiValueToCppString(facebook::jsi::Runtime& runtime, const facebook::jsi::Value& value) {
        if (value.isString()) {
            facebook::jsi::String jsiStr = value.asString(runtime);
            return jsiStr.utf8(runtime);
        } else if (value.isNumber()) {
            return std::to_string(value.asNumber());
        } else if (value.isBool()) {
            return value.getBool() ? "true" : "false";
        } else if (value.isObject()) {
            facebook::jsi::Object obj = value.asObject(runtime);
            if (obj.isFunction(runtime)) {
                return "[Function]";
            } else {
                return "[Object]";
            }
        } else if (value.isNull()) {
            return "null";
        } else if (value.isUndefined()) {
            return "undefined";
        } else {
            return "[Unknown Value]";
        }
    }

    void install(Runtime & jsiRuntime) {
        auto nativeLog = Function::createFromHostFunction(
                                                          jsiRuntime,
            PropNameID::forAscii(jsiRuntime, "nativeLog"),
            1,
            [](
               facebook::jsi::Runtime& runtime,
               const facebook::jsi::Value&,
               const facebook::jsi::Value* args,
                size_t count
            ) {
                std::ostringstream output;

                for (size_t i = 0; i < count; i++) {
                    if (i > 0) {
                        output << " "; // Add space between arguments
                    }
                    output << jsiValueToCppString(runtime, args[i]);
                }

                std::cout << output.str() << std::endl;

                return Value::undefined();
            });

        jsiRuntime.global().setProperty(jsiRuntime, "nativeLog", std::move(nativeLog));
    }
}
  `.trim(),
}

module.exports = plugin
