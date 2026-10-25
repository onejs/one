#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

// Implemented in Swift by OneMacToggleHostView (host/swift), which hosts the
// SwiftUI Toggle in an NSHostingView. The Fabric component view in the core
// library finds the class by name so the library itself carries no Swift.
@protocol OneMacosToggleHosting <NSObject>
@property (nonatomic, copy) NSString *label;
// the controlled state lives in Swift (OneNativeControlled, shared with iOS)
- (void)applyValue:(BOOL)isOn acknowledged:(NSInteger)acknowledged revision:(NSInteger)revision;
@property (nonatomic, copy, nullable) void (^onChange)(BOOL isOn, NSInteger eventCount, NSInteger revision);
@end

NS_ASSUME_NONNULL_END
