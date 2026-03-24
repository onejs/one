#import <React/RCTViewManager.h>

#if __has_include("VxrnNative-Swift.h")
#import "VxrnNative-Swift.h"
#else
#import <VxrnNative/VxrnNative-Swift.h>
#endif

@interface VxrnMenuActionManager : RCTViewManager
@end

@implementation VxrnMenuActionManager

RCT_EXPORT_MODULE(VxrnMenuAction)

- (UIView *)view {
  return [MenuActionView new];
}

RCT_EXPORT_VIEW_PROPERTY(identifier, NSString)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(label, NSString)
RCT_EXPORT_VIEW_PROPERTY(icon, NSString)
RCT_EXPORT_VIEW_PROPERTY(xcassetName, NSString)
RCT_EXPORT_VIEW_PROPERTY(imageSource, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(imageRenderingMode, NSString)
RCT_EXPORT_VIEW_PROPERTY(destructive, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(isOn, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(keepPresented, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(discoverabilityLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(subtitle, NSString)
RCT_EXPORT_VIEW_PROPERTY(singleSelection, BOOL)
RCT_EXPORT_VIEW_PROPERTY(displayAsPalette, BOOL)
RCT_EXPORT_VIEW_PROPERTY(displayInline, BOOL)
RCT_EXPORT_VIEW_PROPERTY(preferredElementSize, NSString)
RCT_REMAP_VIEW_PROPERTY(hidden, routerHidden, BOOL)
RCT_REMAP_VIEW_PROPERTY(titleStyle, titleStyleDict, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(sharesBackground, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(hidesSharedBackground, NSNumber)
RCT_REMAP_VIEW_PROPERTY(tintColor, customTintColor, UIColor)
RCT_REMAP_VIEW_PROPERTY(barButtonItemStyle, barButtonItemStyleProp, NSString)
RCT_REMAP_VIEW_PROPERTY(accessibilityLabel, accessibilityLabelForMenu, NSString)
RCT_REMAP_VIEW_PROPERTY(accessibilityHint, accessibilityHintForMenu, NSString)
RCT_EXPORT_VIEW_PROPERTY(onSelected, RCTDirectEventBlock)

@end
