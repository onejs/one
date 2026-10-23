#import <AppKit/AppKit.h>
#import <QuartzCore/QuartzCore.h>

#include <mutex>

#include <react/renderer/animated/AnimatedModule.h>
#include <react/renderer/animated/NativeAnimatedNodesManagerProvider.h>

#import "OneMacosModules.h"

// drives NativeAnimatedNodesManager frames from a display link on the main run
// loop, the way RCTAnimatedModuleProvider does on iOS
@interface OneMacosAnimatedFrames : NSObject
- (void)setOnRender:(std::function<void()>)onRender;
- (void)start;
- (void)stop;
@end

@implementation OneMacosAnimatedFrames {
  CADisplayLink *_link;
  std::function<void()> _onRender;
  std::recursive_mutex _callbackMutex;
}

- (void)setOnRender:(std::function<void()>)onRender
{
  // rn destroys its manager on the js thread. clear its raw callback there,
  // before an already-enqueued display-link frame can use the freed manager.
  std::lock_guard<std::recursive_mutex> lock(_callbackMutex);
  _onRender = std::move(onRender);
}

- (void)start
{
  std::lock_guard<std::recursive_mutex> lock(_callbackMutex);
  if (_onRender && _link == nil) {
    _link = [NSScreen.mainScreen displayLinkWithTarget:self selector:@selector(frame:)];
    [_link addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
  }
}

- (void)stop
{
  [_link invalidate];
  _link = nil;
}

- (void)frame:(CADisplayLink *)link
{
  // stop can be requested from inside onRender, so keep a local copy while
  // holding a recursive lock through invocation and synchronous invalidation.
  std::lock_guard<std::recursive_mutex> lock(_callbackMutex);
  auto onRender = _onRender;
  if (onRender) {
    onRender();
  }
}

@end

namespace facebook::react {

std::shared_ptr<TurboModule> OneMacosCreateAnimatedModule(std::shared_ptr<CallInvoker> jsInvoker)
{
  auto frames = std::make_shared<OneMacosAnimatedFrames *>([OneMacosAnimatedFrames new]);
  auto onMain = [](bool isAsync, std::function<void()> work) {
    if (isAsync || ![NSThread isMainThread]) {
      dispatch_async(dispatch_get_main_queue(), ^{
        work();
      });
    } else {
      work();
    }
  };
  auto provider = std::make_shared<NativeAnimatedNodesManagerProvider>(
      [frames, onMain](std::function<void()> &&onRender, bool isAsync) {
        [*frames setOnRender:std::move(onRender)];
        onMain(isAsync, [frames]() { [*frames start]; });
      },
      [frames, onMain](bool isAsync) {
        [*frames setOnRender:nullptr];
        onMain(isAsync, [frames]() { [*frames stop]; });
      });
  return std::make_shared<AnimatedModule>(std::move(jsInvoker), std::move(provider));
}

} // namespace facebook::react
