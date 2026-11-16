#import <Foundation/Foundation.h>
#import <React/RCTEventDispatcherProtocol.h>

@interface OneKCFocusedInputSelectionChangedEvent : NSObject <RCTEvent>

- (instancetype)initWithReactTag:(NSNumber *)reactTag event:(NSObject *)event;

@end
