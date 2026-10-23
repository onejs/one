#import <AppKit/AppKit.h>
#import <QuartzCore/QuartzCore.h>

#include <react/renderer/animated/AnimatedModule.h>
#include <react/renderer/animated/NativeAnimatedNodesManagerProvider.h>

#import "OneMacosModules.h"

// drives NativeAnimatedNodesManager frames from a display link on the main run
// loop, the way RCTAnimatedModuleProvider does on iOS
@interface OneMacosAnimatedFrames : NSObject
- (void)start:(std::function<void()>)onRender;
- (void)stop;
@end

@implementation OneMacosAnimatedFrames {
  CADisplayLink *_link;
  std::function<void()> _onRender;
}

- (void)start:(std::function<void()>)onRender
{
  _onRender = std::move(onRender);
  if (_link == nil) {
    _link = [NSScreen.mainScreen displayLinkWithTarget:self selector:@selector(frame:)];
    [_link addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
  }
}

- (void)stop
{
  [_link invalidate];
  _link = nil;
  _onRender = nullptr;
}

- (void)frame:(CADisplayLink *)link
{
  if (_onRender) {
    _onRender();
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
        onMain(isAsync, [frames, onRender]() { [*frames start:onRender]; });
      },
      [frames, onMain](bool isAsync) {
        onMain(isAsync, [frames]() { [*frames stop]; });
      });
  return std::make_shared<AnimatedModule>(std::move(jsInvoker), std::move(provider));
}

} // namespace facebook::react
