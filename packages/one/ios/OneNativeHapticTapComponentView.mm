#import "OneNativeHapticTapComponentView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>

using namespace facebook::react;

// plays a haptic when a tap inside the view ends, on the main thread. a tap
// recognizer watches beside react native's surface touch handler without
// cancelling or delaying its touches, so presses still reach JS unchanged.
// UITapGestureRecognizer already fails once the finger moves, which covers
// scrolls and swipes; a touch held as long as a long press, or one that lands
// while a scroll view is still moving, plays nothing, as Pressable's onPress.
static const NSTimeInterval kLongPressSeconds = 0.5;

@interface OneNativeHapticTapComponentView () <UIGestureRecognizerDelegate>
@end

@implementation OneNativeHapticTapComponentView {
  UITapGestureRecognizer *_tap;
  UIFeedbackGenerator *_generator;
  NSString *_feedback;
  NSTimeInterval _touchStart;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeHapticTapComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeHapticTapProps>();
    _tap = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(tapped:)];
    _tap.cancelsTouchesInView = NO;
    _tap.delaysTouchesBegan = NO;
    _tap.delaysTouchesEnded = NO;
    _tap.delegate = self;
    [self addGestureRecognizer:_tap];
    [self setFeedback:@"selection"];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  auto const &next = static_cast<OneNativeHapticTapProps const &>(*props);
  NSString *feedback = next.feedback.empty() ? @"selection" : [NSString stringWithUTF8String:next.feedback.c_str()];
  if (![feedback isEqualToString:_feedback]) {
    [self setFeedback:feedback];
  }
  [super updateProps:props oldProps:oldProps];
}

- (void)setFeedback:(NSString *)feedback {
  _feedback = feedback;
  if ([feedback isEqualToString:@"selection"]) {
    _generator = [UISelectionFeedbackGenerator new];
    return;
  }
  NSDictionary<NSString *, NSNumber *> *styles = @{
    @"light" : @(UIImpactFeedbackStyleLight),
    @"medium" : @(UIImpactFeedbackStyleMedium),
    @"heavy" : @(UIImpactFeedbackStyleHeavy),
    @"soft" : @(UIImpactFeedbackStyleSoft),
    @"rigid" : @(UIImpactFeedbackStyleRigid),
  };
  _generator = [[UIImpactFeedbackGenerator alloc] initWithStyle:(UIImpactFeedbackStyle)styles[feedback].integerValue];
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer shouldReceiveTouch:(UITouch *)touch {
  for (UIView *view = self.superview; view; view = view.superview) {
    if ([view isKindOfClass:UIScrollView.class]) {
      UIScrollView *scroll = (UIScrollView *)view;
      if (scroll.isDragging || scroll.isDecelerating) {
        return NO;
      }
    }
  }
  _touchStart = touch.timestamp;
  [_generator prepare];
  return YES;
}

- (BOOL)gestureRecognizer:(UIGestureRecognizer *)gestureRecognizer
    shouldRecognizeSimultaneouslyWithGestureRecognizer:(UIGestureRecognizer *)other {
  return YES;
}

- (void)tapped:(UITapGestureRecognizer *)tap {
  if (NSProcessInfo.processInfo.systemUptime - _touchStart >= kLongPressSeconds) {
    return;
  }
  if ([_generator isKindOfClass:UISelectionFeedbackGenerator.class]) {
    [(UISelectionFeedbackGenerator *)_generator selectionChanged];
  } else {
    [(UIImpactFeedbackGenerator *)_generator impactOccurred];
  }
}

@end
