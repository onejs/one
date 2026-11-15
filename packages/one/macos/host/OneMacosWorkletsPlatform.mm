#import <AppKit/AppKit.h>
#import <QuartzCore/QuartzCore.h>

#include <worklets/apple/Networking/AppleNetworkingBackend.h>

#include <mutex>
#include <vector>

#import "OneMacosWorklets.h"

// requestAnimationFrame for worklet runtimes: a display link that runs only
// while callbacks are pending, on the main run loop
@interface OneMacosAnimationFrames : NSObject
+ (instancetype)shared;
- (void)request:(std::function<void(double)>)callback;
- (void)invalidate;
@end

@implementation OneMacosAnimationFrames {
  CADisplayLink *_link;
  std::vector<std::function<void(double)>> _callbacks;
  std::mutex _mutex;
}

+ (instancetype)shared
{
  static OneMacosAnimationFrames *frames;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    frames = [OneMacosAnimationFrames new];
  });
  return frames;
}

- (void)request:(std::function<void(double)>)callback
{
  {
    std::lock_guard<std::mutex> lock(_mutex);
    _callbacks.push_back(std::move(callback));
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self->_link) {
      self->_link = [NSScreen.mainScreen displayLinkWithTarget:self selector:@selector(frame:)];
      [self->_link addToRunLoop:NSRunLoop.mainRunLoop forMode:NSRunLoopCommonModes];
    }
    self->_link.paused = NO;
  });
}

- (void)frame:(CADisplayLink *)link
{
  std::vector<std::function<void(double)>> callbacks;
  {
    std::lock_guard<std::mutex> lock(_mutex);
    callbacks = std::move(_callbacks);
    _callbacks.clear();
  }
  link.paused = YES;
  double timestamp = link.targetTimestamp * 1000;
  for (auto &callback : callbacks) {
    callback(timestamp);
  }
}

- (void)invalidate
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self->_link invalidate];
    self->_link = nil;
  });
}

@end

std::shared_ptr<worklets::NetworkingBackend> OneMacosMakeWorkletsNetworkingBackend()
{
  return std::make_shared<worklets::AppleNetworkingBackend>();
}

void OneMacosRequestAnimationFrame(std::function<void(double)> callback)
{
  [[OneMacosAnimationFrames shared] request:std::move(callback)];
}

void OneMacosInvalidateAnimationFrames()
{
  [[OneMacosAnimationFrames shared] invalidate];
}
