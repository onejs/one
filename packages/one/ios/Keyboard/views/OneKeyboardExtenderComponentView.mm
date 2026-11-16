#import "OneKeyboardExtenderComponentView.h"

#import "One-Swift.h"

#import <React/RCTSurfaceTouchHandler.h>

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

#import "RCTFabricComponentsPlugins.h"

#import <React/RCTTouchHandler.h>
#import <UIKit/UIKit.h>

using namespace facebook::react;

// MARK: View
@interface OneKeyboardExtenderComponentView () <RCTOneKeyboardExtenderViewProtocol>
@end

@implementation OneKeyboardExtenderComponentView {
  UIView *_contentView;
  UIView *_sharedInputAccessoryView;
  NSHashTable<UIView<UITextInput> *> *_attachedInputs;
  BOOL _isObserving;
  RCTSurfaceTouchHandler *_touchHandler;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneKeyboardExtenderComponentDescriptor>();
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
    static const auto defaultProps = std::make_shared<const OneKeyboardExtenderProps>();
    _props = defaultProps;
    _touchHandler = [RCTSurfaceTouchHandler new];
    _contentView = [[UIView alloc] initWithFrame:CGRectZero];
    _attachedInputs = [NSHashTable weakObjectsHashTable];
  }
  [_touchHandler attachToView:_contentView];
  [self startObserving];
  return self;
}

- (void)dealloc
{
  [self stopObserving];
}

- (void)prepareForRecycle
{
  // clean up local variables state
  _enabled = NO;
  _transparent = NO;
  [self detachInputAccessoryView];
  _sharedInputAccessoryView = nil;

  // clean up listeners
  [self stopObserving];

  [super prepareForRecycle];
}

// MARK: Listeners
- (void)startObserving
{
  if (_isObserving) {
    return;
  }

  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleTextInputDidBeginEditing:)
                                               name:UITextFieldTextDidBeginEditingNotification
                                             object:nil];

  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleTextInputDidBeginEditing:)
                                               name:UITextViewTextDidBeginEditingNotification
                                             object:nil];

  _isObserving = YES;
}

- (void)stopObserving
{
  if (!_isObserving) {
    return;
  }

  [[NSNotificationCenter defaultCenter] removeObserver:self];

  _isObserving = NO;
}

- (void)handleTextInputDidBeginEditing:(NSNotification *)notification
{
  if (self.enabled) {
    [self attachToTextInput:(UIView *)notification.object];
  } else {
    [self detachInputAccessoryView];
  }
}

- (void)attachToTextInput:(UIView *)textInput
{
  if ([textInput isKindOfClass:[UITextField class]]) {
    [self attachInputAccessoryViewTo:(UITextField *)textInput];
  } else if ([textInput isKindOfClass:[UITextView class]]) {
    [self attachInputAccessoryViewTo:(UITextView *)textInput];
  }
}

- (void)createSharedInputAccessoryView
{
  CGRect internalFrame = _contentView.subviews[0].frame;
  _sharedInputAccessoryView = [KeyboardExtenderContainerView
      createWithFrame:CGRectMake(
                          0, 0, UIScreen.mainScreen.bounds.size.width, internalFrame.size.height)
          contentView:_contentView
          transparent:_transparent];
}

- (void)attachInputAccessoryViewTo:(UIView<UITextInput> *)input
{
  // Initialize the shared input accessory view once
  if (!_sharedInputAccessoryView) {
    [self createSharedInputAccessoryView];
  }

  // Assign the inputAccessoryView
  if ([input isKindOfClass:[UITextField class]]) {
    ((UITextField *)input).inputAccessoryView = _sharedInputAccessoryView;
  } else if ([input isKindOfClass:[UITextView class]]) {
    ((UITextView *)input).inputAccessoryView = _sharedInputAccessoryView;
  }
  [_attachedInputs addObject:input];

  // Refresh input view to apply changes
  [input reloadInputViews];
}

- (void)detachInputAccessoryView
{
  // Remove the accessory view from every text input this extender attached to
  for (UIView<UITextInput> *textInput in _attachedInputs.allObjects) {
    if (textInput.inputAccessoryView == _sharedInputAccessoryView) {
      if ([textInput isKindOfClass:[UITextField class]]) {
        ((UITextField *)textInput).inputAccessoryView = nil;
      } else if ([textInput isKindOfClass:[UITextView class]]) {
        ((UITextView *)textInput).inputAccessoryView = nil;
      }
      [textInput reloadInputViews];
    }
  }
  [_attachedInputs removeAllObjects];
}

// MARK: touch handling
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  BOOL canReceiveTouchEvents = ([self isUserInteractionEnabled] && ![self isHidden] && _enabled);
  if (!canReceiveTouchEvents) {
    return nil;
  }

  // `hitSubview` is the topmost subview which was hit. The hit point can
  // be outside the bounds of `view` (e.g., if -clipsToBounds is NO).
  UIView *hitSubview = nil;
  BOOL isPointInside = [self pointInside:point withEvent:event];
  if (![self clipsToBounds] || isPointInside) {
    // TODO: should we take zIndex into consideration?
    // The default behaviour of UIKit is that if a view does not contain a point,
    // then no subviews will be returned from hit testing, even if they contain
    // the hit point. By doing hit testing directly on the subviews, we bypass
    // the strict containment policy (i.e., UIKit guarantees that every ancestor
    // of the hit view will return YES from -pointInside:withEvent:). See:
    //  - https://developer.apple.com/library/ios/qa/qa2013/qa1812.html
    for (UIView *subview in [_contentView.subviews reverseObjectEnumerator]) {
      CGPoint convertedPoint = [subview convertPoint:point fromView:self];
      hitSubview = [subview hitTest:convertedPoint withEvent:event];
      if (hitSubview != nil) {
        break;
      }
    }
  }
  return hitSubview;
}

// MARK: props updater
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  [self startObserving];

  const auto &newViewProps = *std::static_pointer_cast<const OneKeyboardExtenderProps>(props);

  if (newViewProps.transparent != self.transparent) {
    [self updateTransparentState:newViewProps.transparent];
  }

  if (newViewProps.enabled != self.enabled) {
    [self updateEnabledState:newViewProps.enabled];
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)updateTransparentState:(BOOL)transparent
{
  _transparent = transparent;

  if (!_sharedInputAccessoryView) {
    return;
  }

  // the container background is fixed at creation, so re-create it with the new value
  [self detachInputAccessoryView];
  [_contentView removeFromSuperview];
  _sharedInputAccessoryView = nil;

  if (_enabled) {
    [self updateEnabledState:YES];
  }
}

- (void)updateEnabledState:(BOOL)enabled
{
  _enabled = enabled;

  if (!enabled) {
    [self detachInputAccessoryView];
  } else {
    // Re-attach if a text input is active
    UIResponder *firstResponder = OneKCBridge.currentResponder;
    if ([firstResponder conformsToProtocol:@protocol(UITextInput)]) {
      [self attachToTextInput:(UIView *)firstResponder];
    }
  }
}

// MARK: child management
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                          index:(NSInteger)index
{
  [_contentView insertSubview:childComponentView atIndex:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                            index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
}

- (void)layoutSubviews
{
  [_sharedInputAccessoryView layoutSubviews];
}

Class<RCTComponentViewProtocol> OneKeyboardExtenderComponentViewCls(void)
{
  return OneKeyboardExtenderComponentView.class;
}

@end
