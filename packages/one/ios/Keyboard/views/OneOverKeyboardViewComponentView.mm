#import "OneOverKeyboardViewComponentView.h"

#import "One-Swift.h"

#import <React/RCTSurfaceTouchHandler.h>

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import "OneOverKeyboardViewComponentDescriptor.h"

#import "RCTFabricComponentsPlugins.h"

#import <React/RCTTouchHandler.h>
#import <UIKit/UIKit.h>

using namespace facebook::react;

// MARK: View
@interface OneOverKeyboardViewComponentView () <RCTOneOverKeyboardViewViewProtocol>
@end

@implementation OneOverKeyboardViewComponentView {
  UIView *_contentView;
  RCTSurfaceTouchHandler *_touchHandler;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneOverKeyboardViewComponentDescriptor>();
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
    static const auto defaultProps = std::make_shared<const OneOverKeyboardViewProps>();
    _props = defaultProps;
    _touchHandler = [RCTSurfaceTouchHandler new];
    _contentView = [[UIView alloc] initWithFrame:CGRectZero];
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

// MARK: lifecycle methods
- (void)didMoveToSuperview
{
  if (self.superview == nil) {
    [self hide];
  }
}

// MARK: touch handling
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  BOOL canReceiveTouchEvents = ([self isUserInteractionEnabled] && ![self isHidden] && _visible);
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
  const auto &newViewProps = *std::static_pointer_cast<const OneOverKeyboardViewProps>(props);

  if (newViewProps.visible != _visible) {
    if (newViewProps.visible) {
      [self show];
    } else {
      [self hide];
    }
  }

  [super updateProps:props oldProps:oldProps];
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

- (void)show
{
  if (_visible) {
    return;
  }

  UIWindow *topWindow = [OneKCBridge topWindow];
  _visible = true;
  _contentView.frame = topWindow.bounds;
  _contentView.autoresizingMask =
      UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

  [_touchHandler attachToView:_contentView];
  [topWindow addSubview:_contentView];
}

- (void)hide
{
  if (!_visible) {
    return;
  }
  _visible = false;
  [_contentView removeFromSuperview];
  [_touchHandler detachFromView:_contentView];
}

Class<RCTComponentViewProtocol> OneOverKeyboardViewComponentViewCls(void)
{
  return OneOverKeyboardViewComponentView.class;
}

@end
