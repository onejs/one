#import "OneKCKeyboardMoveEvent.h"
#import <React/RCTAssert.h>

@implementation OneKCKeyboardMoveEvent {
  NSNumber *_progress;
  NSNumber *_height;
  NSNumber *_duration;
  NSNumber *_target;
  uint16_t _coalescingKey;
}

@synthesize viewTag = _viewTag;
@synthesize eventName = _eventName;

- (instancetype)initWithReactTag:(NSNumber *)reactTag
                           event:(NSString *)event
                          height:(NSNumber *)height
                        progress:(NSNumber *)progress
                        duration:(NSNumber *)duration
                          target:(NSNumber *)target
{
  RCTAssertParam(reactTag);

  if ((self = [super init])) {
    _eventName = [event copy];
    _viewTag = reactTag;
    _progress = progress;
    _height = height;
    _duration = duration;
    _target = target;
    _coalescingKey = 0;
  }
  return self;
}

RCT_NOT_IMPLEMENTED(-(instancetype)init)

- (uint16_t)coalescingKey
{
  return _coalescingKey;
}

- (NSDictionary *)body
{
  NSDictionary *body = @{
    @"progress" : _progress,
    @"height" : _height,
    @"duration" : _duration,
    @"target" : _target,
  };

  return body;
}

- (BOOL)canCoalesce
{
  return NO;
}

- (OneKCKeyboardMoveEvent *)coalesceWithEvent:(OneKCKeyboardMoveEvent *)newEvent
{
  return newEvent;
}

+ (NSString *)moduleDotMethod
{
  return @"RCTEventEmitter.receiveEvent";
}

- (NSArray *)arguments
{
  return @[ self.viewTag, RCTNormalizeInputEventName(self.eventName), [self body] ];
}

@end
