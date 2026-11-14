#import "OneBunEngine.h"

#import <Foundation/Foundation.h>
#import <objc/runtime.h>

#import <cxxreact/MessageQueueThread.h>
#import <react/runtime/JSRuntimeFactory.h>
#import "BunRuntime.h"

namespace facebook::react {

// runs the app's bun-compiled program in place of its bundle
class RCTBunInstance : public JSRuntimeFactory {
 public:
  std::unique_ptr<JSRuntime> createJSRuntime(std::shared_ptr<MessageQueueThread> msgQueueThread) noexcept override
  {
    // bun's VM belongs to the thread that creates it
    std::unique_ptr<jsi::Runtime> runtime;
    msgQueueThread->runOnQueueSync([&] { runtime = bun::makeBunRuntime(); });
    if (!runtime) {
      abort();
    }
    return std::make_unique<JSIRuntimeHolder>(std::move(runtime));
  }
};

} // namespace facebook::react

bool one_bun_engine_has_compiled_program(void)
{
  NSString *path = [NSBundle.mainBundle pathForResource:@"main" ofType:@"jsbundle"];
  NSFileHandle *file = path ? [NSFileHandle fileHandleForReadingAtPath:path] : nil;
  NSData *head = [file readDataOfLength:sizeof(facebook::bun::kCompiledEntryMarker) - 1];
  [file closeFile];
  return head.length == sizeof(facebook::bun::kCompiledEntryMarker) - 1 &&
      memcmp(head.bytes, facebook::bun::kCompiledEntryMarker, head.length) == 0;
}

// javascriptcore runs javascript frames on the native stack, and a release
// RCTJSThreadManager starts its thread with NSThread's 512 KB default (hermes
// keeps its frames on the heap). start that thread with a main-thread-sized stack.
static void startJSThreadWithLargeStack(id self, SEL)
{
  NSThread *thread = [[NSThread alloc] initWithTarget:[self class] selector:NSSelectorFromString(@"runRunLoop") object:nil];
  thread.name = @"com.facebook.react.runtime.JavaScript";
  thread.qualityOfService = NSQualityOfServiceUserInteractive;
  thread.stackSize = 8 << 20;
  [self setValue:thread forKey:@"_jsThread"];
  [thread start];
}

void *jsrt_create_bun_factory(void)
{
  // the factory exists before RCTInstance creates its thread manager
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    Method start = class_getInstanceMethod(NSClassFromString(@"RCTJSThreadManager"), NSSelectorFromString(@"startJSThread"));
    if (!start) {
      abort();
    }
    method_setImplementation(start, (IMP)startJSThreadWithLargeStack);
  });
  return new facebook::react::RCTBunInstance();
}
