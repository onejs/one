#import "OneNativeSourceEventsBridge.h"
#import <React/RCTEventEmitter.h>

@interface OneNativeSourceEvents : RCTEventEmitter
+ (void)sendChannel:(NSString *)channel argsJson:(NSString *)argsJson;
@end

static NSMutableSet<NSString *> *OneNativeSourceEventChannels(void) {
  static NSMutableSet<NSString *> *channels;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ channels = [NSMutableSet set]; });
  return channels;
}

// the bridge retains its modules; a weak backlink posts without owning it.
static __weak OneNativeSourceEvents *sharedInstance;

@implementation OneNativeSourceEvents

RCT_EXPORT_MODULE(OneNativeSourceEvents)

- (instancetype)init {
  if (self = [super init]) {
    sharedInstance = self;
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents {
  @synchronized(OneNativeSourceEventChannels()) {
    return OneNativeSourceEventChannels().allObjects;
  }
}

RCT_EXPORT_METHOD(addListener:(NSString *)channel) {
  // react validates the channel before the first native event can be sent.
  @synchronized(OneNativeSourceEventChannels()) {
    [OneNativeSourceEventChannels() addObject:channel];
  }
  [super addListener:channel];
}

+ (void)sendChannel:(NSString *)channel argsJson:(NSString *)argsJson {
  @synchronized(OneNativeSourceEventChannels()) {
    [OneNativeSourceEventChannels() addObject:channel];
  }
  OneNativeSourceEvents *bridge = sharedInstance;
  // the bridge is gone only while the app tears down; dropping then is
  // correct because no javascript runtime can receive the event.
  if (!bridge) return;
  NSData *data = [argsJson dataUsingEncoding:NSUTF8StringEncoding];
  id body = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:NULL] : nil;
  if (![body isKindOfClass:[NSArray class]]) return;
  [bridge sendEventWithName:channel body:body];
}

@end

void OneNativeSourceSendEvent(NSString *channel, NSString *argsJson) {
  [OneNativeSourceEvents sendChannel:channel argsJson:argsJson];
}
