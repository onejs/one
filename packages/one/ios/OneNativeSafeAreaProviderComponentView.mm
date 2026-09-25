#import "OneNativeSafeAreaProviderComponentView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>

using namespace facebook::react;

// first-party safe-area provider. reports its own safeAreaInsets and its
// frame in the parent view controller's coordinates through
// onNativeInsetsChange, following upstream RNCSafeAreaProvider: layout and
// inset callbacks feed one deduped publisher, keyboard notifications
// invalidate, zero-size frames and unchanged values never emit, and values
// cache only on delivery so a first reading before mount retries instead of
// sticking at zero.
//
// the observation lives in this view deliberately, with no separate content
// view: in RCTViewComponentView, children mount into the component view
// itself, so a full-frame content view would sit in front of them as an
// empty sibling, swallowing every touch and occluding the subtree.
@implementation OneNativeSafeAreaProviderComponentView {
  UIEdgeInsets _currentInsets;
  CGRect _currentFrame;
  BOOL _initialInsetsSent;
  BOOL _registeredNotifications;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSafeAreaProviderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSafeAreaProviderProps>();
    _currentInsets = UIEdgeInsetsZero;
    _currentFrame = CGRectZero;
    _initialInsetsSent = NO;
    _registeredNotifications = NO;
  }
  return self;
}

- (void)willMoveToSuperview:(UIView *)newSuperview {
  [super willMoveToSuperview:newSuperview];
  if (newSuperview && !_registeredNotifications) {
    _registeredNotifications = YES;
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    [center addObserver:self
               selector:@selector(invalidateSafeAreaInsets)
                   name:UIKeyboardDidShowNotification
                 object:nil];
    [center addObserver:self
               selector:@selector(invalidateSafeAreaInsets)
                   name:UIKeyboardDidHideNotification
                 object:nil];
    [center addObserver:self
               selector:@selector(invalidateSafeAreaInsets)
                   name:UIKeyboardDidChangeFrameNotification
                 object:nil];
  }
}

- (void)safeAreaInsetsDidChange {
  [super safeAreaInsetsDidChange];
  [self invalidateSafeAreaInsets];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  [self invalidateSafeAreaInsets];
}

- (void)invalidateSafeAreaInsets {
  if (!self.superview) {
    return;
  }
  // called before react native sets the view size, so wait rather than
  // publish insets against a zero frame.
  if (CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
    return;
  }
  UIEdgeInsets insets = self.safeAreaInsets;
  UIResponder *responder = self;
  while (responder && ![responder isKindOfClass:[UIViewController class]]) {
    responder = [responder nextResponder];
  }
  CGRect frame;
  UIView *parent = ((UIViewController *)responder).view;
  if (parent) {
    frame = [self convertRect:self.bounds toView:parent];
  } else if (self.window) {
    frame = [self convertRect:self.bounds toView:self.window];
  } else {
    frame = self.bounds;
  }
  CGFloat scale = self.window ? self.window.screen.scale : 0;
  CGFloat threshold = scale > 0 ? 1 / scale : 1;
  if (_initialInsetsSent && fabs(insets.top - _currentInsets.top) < threshold &&
      fabs(insets.left - _currentInsets.left) < threshold &&
      fabs(insets.bottom - _currentInsets.bottom) < threshold &&
      fabs(insets.right - _currentInsets.right) < threshold && CGRectEqualToRect(frame, _currentFrame)) {
    return;
  }
  if (!self->_eventEmitter) {
    // mount not complete: cache nothing so the next trigger retries.
    return;
  }
  auto emitter =
      std::static_pointer_cast<const OneNativeSafeAreaProviderEventEmitter>(self->_eventEmitter);
  emitter->onNativeInsetsChange(
      {.insetTop = insets.top,
       .insetRight = insets.right,
       .insetBottom = insets.bottom,
       .insetLeft = insets.left,
       .frameX = frame.origin.x,
       .frameY = frame.origin.y,
       .frameWidth = frame.size.width,
       .frameHeight = frame.size.height});
  _initialInsetsSent = YES;
  _currentInsets = insets;
  _currentFrame = frame;
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _currentInsets = UIEdgeInsetsZero;
  _currentFrame = CGRectZero;
  _initialInsetsSent = NO;
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  _registeredNotifications = NO;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

@end
