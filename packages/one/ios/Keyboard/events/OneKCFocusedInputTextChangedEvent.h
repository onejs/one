#import <Foundation/Foundation.h>
#import <React/RCTEventDispatcherProtocol.h>

@interface OneKCFocusedInputTextChangedEvent : NSObject <RCTEvent>

- (instancetype)initWithReactTag:(NSNumber *)reactTag text:(NSString *)text;

@end
