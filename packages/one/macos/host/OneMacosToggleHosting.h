#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

// Implemented in Swift by OneMacToggleHostView (host/swift), which hosts the
// SwiftUI Toggle in an NSHostingView. The Fabric component view in the core
// library finds the class by name so the library itself carries no Swift.
@protocol OneMacosToggleHosting <NSObject>
@property (nonatomic, copy) NSString *label;
@property (nonatomic, assign) BOOL isOn;
@property (nonatomic, copy, nullable) void (^onChange)(BOOL isOn);
@end

NS_ASSUME_NONNULL_END
