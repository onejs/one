#import <AppKit/AppKit.h>

@protocol OneMacosButtonHosting <NSObject>
@property (nonatomic, copy) NSString *title;
@property (nonatomic, copy) NSString *systemImage;
@property (nonatomic, assign) BOOL disabled;
@property (nonatomic, copy) void (^onPress)(void);
- (BOOL)accessibilityPerformPress;
@end

@protocol OneMacosSegmentedControlHosting <NSObject>
@property (nonatomic, copy) NSArray<NSString *> *labels;
@property (nonatomic, assign) BOOL disabled;
@property (nonatomic, copy) void (^onChange)(NSInteger selectedIndex, NSInteger eventCount, NSInteger revision);
- (void)applyValue:(NSInteger)value acknowledged:(NSInteger)acknowledged revision:(NSInteger)revision;
@end
