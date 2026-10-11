#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>

// the device event channel for native-source module events. generated glue
// posts one json array per event; javascript subscribes by channel name.
@interface OneNativeSourceEvents : RCTEventEmitter

// posts argsJson (a json array string) on channel, registering the channel
// first so debug builds never warn about an unlisted event.
+ (void)sendChannel:(NSString *)channel argsJson:(NSString *)argsJson;

@end
