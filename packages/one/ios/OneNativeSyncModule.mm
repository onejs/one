#import <React/RCTAssert.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTCallInvoker.h>
#import <React/RCTCallInvokerModule.h>
#import <React/RCTConversions.h>
#import <React/RCTView.h>

#import <worklets/NativeModules/WorkletsModuleProxy.h>
#import <worklets/apple/WorkletsModule.h>

#import "OneNativeSyncBridge.h"
#import "OneNativeSyncHost.h"
#import "One-Swift.h"

// the concrete bridge exposes its jsi runtime; the category keeps the compiler
// quiet. same declaration react-native-worklets uses for its own installer.
@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

static NSObject *NSObjectFromJSI(jsi::Runtime &runtime, const jsi::Value &value) {
  if (value.isString()) {
    return RCTNSStringFromString(value.asString(runtime).utf8(runtime));
  }
  if (value.isBool()) {
    return @(value.getBool());
  }
  if (value.isNumber()) {
    return @(value.getNumber());
  }
  throw jsi::JSError(runtime, "OneNativeSyncState value must be a string, number, or boolean");
}

static jsi::Value JSIFromNSObject(jsi::Runtime &runtime, NSObject *value) {
  if ([value isKindOfClass:[NSString class]]) {
    return jsi::Value(
        runtime, jsi::String::createFromUtf8(runtime, [(NSString *)value UTF8String]));
  }
  if ([value isKindOfClass:[NSNumber class]]) {
    // CFBoolean is the only reliable bool test: numeric comparison equates 1 with YES.
    if (CFGetTypeID((__bridge CFTypeRef)value) == CFBooleanGetTypeID()) {
      return jsi::Value([(NSNumber *)value boolValue]);
    }
    return jsi::Value([(NSNumber *)value doubleValue]);
  }
  throw jsi::JSError(runtime, "OneNativeSyncState stored an unsupported value");
}

int32_t OneNativeSyncCreate(jsi::Runtime &runtime, const jsi::Value &initial) {
  return [OneNativeSyncRegistry create:NSObjectFromJSI(runtime, initial)];
}

void OneNativeSyncRelease(int32_t stateId) {
  [OneNativeSyncRegistry destroy:stateId];
}

jsi::Value OneNativeSyncGet(jsi::Runtime &runtime, int32_t stateId) {
  NSObject *value = [OneNativeSyncRegistry get:stateId];
  if (!value) {
    throw jsi::JSError(runtime, "OneNativeSyncState was released");
  }
  return JSIFromNSObject(runtime, value);
}

void OneNativeSyncSet(jsi::Runtime &runtime, int32_t stateId, const jsi::Value &value) {
  // a set racing release is a no-op: the registry drops unknown ids, so teardown
  // never throws out of an in-flight event.
  [OneNativeSyncRegistry set:stateId value:NSObjectFromJSI(runtime, value)];
}

@interface OneNativeSyncModule : NSObject <RCTBridgeModule, RCTCallInvokerModule>
@end

@implementation OneNativeSyncModule

@synthesize bridge = _bridge;
@synthesize callInvoker = callInvoker_;

RCT_EXPORT_MODULE(OneNativeSyncState)

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install)
{
  RCTBridge *bridge = self.bridge;
  RCTAssert(bridge, @"OneNativeSyncState.install needs a bridge");
  jsi::Runtime &rnRuntime = *reinterpret_cast<jsi::Runtime *>(bridge.runtime);
  WorkletsModule *worklets = [bridge moduleForName:@"WorkletsModule"];
  RCTAssert(worklets, @"OneNativeSyncState requires react-native-worklets");
  std::shared_ptr<worklets::WorkletRuntime> uiRuntime =
      [worklets getWorkletsModuleProxy]->getUIWorkletRuntime();
  RCTAssert(uiRuntime, @"OneNativeSyncState requires the worklets UI runtime");
  installOneNativeSyncState(rnRuntime, uiRuntime, [callInvoker_ callInvoker]);
  return @YES;
}

@end
