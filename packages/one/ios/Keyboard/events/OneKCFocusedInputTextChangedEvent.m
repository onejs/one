#import "OneKCFocusedInputTextChangedEvent.h"
#import <React/RCTAssert.h>

@implementation OneKCFocusedInputTextChangedEvent {
  NSString *_text;
  uint16_t _coalescingKey;
}

- (NSString *)eventName
{
  return @"onFocusedInputTextChanged";
}

@synthesize viewTag = _viewTag;

- (instancetype)initWithReactTag:(NSNumber *)reactTag text:(NSString *)text
{
  RCTAssertParam(reactTag);

  if ((self = [super init])) {
    _viewTag = reactTag;
    _text = text;
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
    @"text" : _text,
  };

  return body;
}

- (BOOL)canCoalesce
{
  return NO;
}

- (OneKCFocusedInputTextChangedEvent *)coalesceWithEvent:(OneKCFocusedInputTextChangedEvent *)newEvent
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
