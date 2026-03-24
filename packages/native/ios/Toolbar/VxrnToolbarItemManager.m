#import <React/RCTViewManager.h>

#if __has_include("VxrnNative-Swift.h")
#import "VxrnNative-Swift.h"
#else
#import <VxrnNative/VxrnNative-Swift.h>
#endif

@interface VxrnToolbarItemManager : RCTViewManager
@end

@implementation VxrnToolbarItemManager

RCT_EXPORT_MODULE(VxrnToolbarItem)

- (UIView *)view {
  return [ToolbarItemView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)
RCT_EXPORT_VIEW_PROPERTY(type, NSString)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(systemImageName, NSString)
RCT_EXPORT_VIEW_PROPERTY(xcassetName, NSString)
RCT_EXPORT_VIEW_PROPERTY(imageSource, NSDictionary)
RCT_REMAP_VIEW_PROPERTY(tintColor, tintColor_, UIColor)
RCT_EXPORT_VIEW_PROPERTY(imageRenderingMode, NSString)
RCT_EXPORT_VIEW_PROPERTY(hidesSharedBackground, BOOL)
RCT_EXPORT_VIEW_PROPERTY(sharesBackground, BOOL)
RCT_EXPORT_VIEW_PROPERTY(barButtonItemStyle, NSString)
RCT_EXPORT_VIEW_PROPERTY(width, NSNumber)
RCT_REMAP_VIEW_PROPERTY(hidden, routerHidden, BOOL)
RCT_EXPORT_VIEW_PROPERTY(selected, BOOL)
RCT_EXPORT_VIEW_PROPERTY(badgeConfiguration, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(titleStyle, NSDictionary)
RCT_REMAP_VIEW_PROPERTY(accessibilityLabel, routerAccessibilityLabel, NSString)
RCT_REMAP_VIEW_PROPERTY(accessibilityHint, routerAccessibilityHint, NSString)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onSelected, RCTDirectEventBlock)

@end
