#import "OneKeyboardGestureAreaComponentView.h"

#import "One-Swift.h"

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

#import "RCTFabricComponentsPlugins.h"

#import <UIKit/UIKit.h>

using namespace facebook::react;

// MARK: View
@interface OneKeyboardGestureAreaComponentView () <RCTOneKeyboardGestureAreaViewProtocol>
@end

@implementation OneKeyboardGestureAreaComponentView {
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneKeyboardGestureAreaComponentDescriptor>();
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

// MARK: Constructor
- (instancetype)init
{
  if (self = [super init]) {
    [OneKCBridge installResponderSwizzle];
    static const auto defaultProps = std::make_shared<const OneKeyboardGestureAreaProps>();
    _props = defaultProps;
  }
  return self;
}

// MARK: lifecycle methods
- (void)didMoveToSuperview
{
  if (_textInputNativeID == nil) {
    return;
  }

  if (self.superview == nil) {
    // unmounted
    [[OneKCKeyboardOffsetProvider shared] removeOffsetForTextInputNativeID:_textInputNativeID
                                                              withTag:[OneKCBridge reactTag:self]];
  } else if (_offset != nil) {
    // (re-)mounted, i.e. moved within the hierarchy without receiving new props
    [[OneKCKeyboardOffsetProvider shared] setOffsetForTextInputNativeID:_textInputNativeID
                                                            offset:_offset
                                                           withTag:[OneKCBridge reactTag:self]];
  }
}

// MARK: props updater
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const OneKeyboardGestureAreaProps>(props);
  const OneKeyboardGestureAreaProps *oldViewPropsPtr =
      oldProps ? std::static_pointer_cast<const OneKeyboardGestureAreaProps>(oldProps).get() : nullptr;
  NSString *newTextInputNativeID = !newViewProps.textInputNativeID.empty()
      ? [NSString stringWithUTF8String:newViewProps.textInputNativeID.c_str()]
      : nil;
  NSString *oldTextInputNativeID = (oldViewPropsPtr && !oldViewPropsPtr->textInputNativeID.empty())
      ? [NSString stringWithUTF8String:oldViewPropsPtr->textInputNativeID.c_str()]
      : nil;
  NSNumber *tag = [OneKCBridge reactTag:self];
  NSNumber *newOffset = @(newViewProps.offset);

  if (newTextInputNativeID != oldTextInputNativeID) {
    if (oldTextInputNativeID) {
      [[OneKCKeyboardOffsetProvider shared] removeOffsetForTextInputNativeID:oldTextInputNativeID
                                                                withTag:tag];
    }
    if (newTextInputNativeID) {
      [[OneKCKeyboardOffsetProvider shared] setOffsetForTextInputNativeID:newTextInputNativeID
                                                              offset:newOffset
                                                             withTag:tag];
    }
  } else if (!oldViewPropsPtr || newViewProps.offset != oldViewPropsPtr->offset) {
    if (newTextInputNativeID) {
      [[OneKCKeyboardOffsetProvider shared] removeOffsetForTextInputNativeID:newTextInputNativeID
                                                                withTag:tag];
      [[OneKCKeyboardOffsetProvider shared] setOffsetForTextInputNativeID:newTextInputNativeID
                                                              offset:newOffset
                                                             withTag:tag];
    }
  }

  // keep ivars in sync, so `didMoveToSuperview` can clean up (or restore) the registration
  _textInputNativeID = newTextInputNativeID;
  _offset = newOffset;

  [super updateProps:props oldProps:oldProps];
}

Class<RCTComponentViewProtocol> OneKeyboardGestureAreaComponentViewCls(void)
{
  return OneKeyboardGestureAreaComponentView.class;
}

@end
