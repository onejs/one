#import <Foundation/Foundation.h>
#import <React/RCTEventDispatcherProtocol.h>

@interface OneKCKeyboardMoveEvent : NSObject <RCTEvent>

- (instancetype)initWithReactTag:(NSNumber *)reactTag
                           event:(NSString *)event
                          height:(NSNumber *)height
                        progress:(NSNumber *)progress
                        duration:(NSNumber *)duration
                          target:(NSNumber *)target;

@end
