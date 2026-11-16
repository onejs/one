#import "OneKCFocusedInputLayoutChangedEvent.h"
#import <React/RCTAssert.h>

@implementation OneKCFocusedInputLayoutChangedEvent {
  NSNumber *_target;
  NSNumber *_parentScrollViewTarget;
  NSObject *_layout;
  uint16_t _coalescingKey;
}

- (NSString *)eventName
{
  return @"onFocusedInputLayoutChanged";
}

@synthesize viewTag = _viewTag;

- (instancetype)initWithReactTag:(NSNumber *)reactTag event:(NSObject *)event
{
  RCTAssertParam(reactTag);

  if ((self = [super init])) {
    _viewTag = reactTag;
    _target = [event valueForKey:@"target"];
    _parentScrollViewTarget = [event valueForKey:@"parentScrollViewTarget"];
    _layout = [event valueForKey:@"layout"];
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
    @"target" : _target,
    @"parentScrollViewTarget" : _parentScrollViewTarget,
    @"layout" : _layout,
  };

  return body;
}

- (BOOL)canCoalesce
{
  return NO;
}

- (OneKCFocusedInputLayoutChangedEvent *)coalesceWithEvent:(OneKCFocusedInputLayoutChangedEvent *)newEvent
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
