#import "OneClippingScrollViewDecoratorViewComponentView.h"

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

#import "RCTFabricComponentsPlugins.h"

#import <TargetConditionals.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

using namespace facebook::react;

#pragma mark - Helpers

static NSString *const KCNoScrollRectClassPrefix = @"OneKC_NoScrollRect_";
static NSString *const KCFixedHitTestClassPrefix = @"OneKC_FixedHitTest_";

static UIScrollView *KCFindFirstScrollView(UIView *view)
{
  for (UIView *subview in view.subviews) {
    if ([subview isKindOfClass:[UIScrollView class]] &&
        ![subview isKindOfClass:[UITextView class]]) {
      return (UIScrollView *)subview;
    }
    UIScrollView *found = KCFindFirstScrollView(subview);
    if (found) {
      return found;
    }
  }
  return nil;
}

static void KCApplyNoopScrollRectToVisible(UIScrollView *scrollView)
{
  if (!scrollView) {
    return;
  }

  Class originalClass = object_getClass(scrollView);
  NSString *originalClassName = NSStringFromClass(originalClass);

  // KVO and other runtime subclasses can sit above our patch.
  for (Class cls = originalClass; cls; cls = class_getSuperclass(cls)) {
    if ([NSStringFromClass(cls) hasPrefix:KCNoScrollRectClassPrefix]) {
      return;
    }
  }

  NSString *subclassName = [KCNoScrollRectClassPrefix stringByAppendingString:originalClassName];
  Class subclass = NSClassFromString(subclassName);

  if (!subclass) {
    subclass = objc_allocateClassPair(originalClass, subclassName.UTF8String, 0);
    if (!subclass) {
      return;
    }

    Method original =
        class_getInstanceMethod(originalClass, @selector(scrollRectToVisible:animated:));
    if (original) {
      IMP noopImp = imp_implementationWithBlock(
          ^(__unused UIScrollView *self, __unused CGRect rect, __unused BOOL animated){
              // no-op
          });
      class_addMethod(
          subclass,
          @selector(scrollRectToVisible:animated:),
          noopImp,
          method_getTypeEncoding(original));
    }

    objc_registerClassPair(subclass);
  }

  object_setClass(scrollView, subclass);
}

// Workaround for https://github.com/facebook/react-native/issues/54123
// RN 0.81+ ScrollView contentInset area doesn't respond to touch events.
// Can be removed once the upstream fix lands.
static void KCApplyFixedHitTest(UIScrollView *scrollView)
{
  if (!scrollView || !scrollView.superview) {
    return;
  }

  UIView *container = scrollView.superview;
  Class originalClass = object_getClass(container);
  NSString *originalClassName = NSStringFromClass(originalClass);

  // KVO and other runtime subclasses can sit above our patch.
  for (Class cls = originalClass; cls; cls = class_getSuperclass(cls)) {
    if ([NSStringFromClass(cls) hasPrefix:KCFixedHitTestClassPrefix]) {
      return;
    }
  }

  NSString *subclassName = [KCFixedHitTestClassPrefix stringByAppendingString:originalClassName];
  Class subclass = NSClassFromString(subclassName);

  if (!subclass) {
    subclass = objc_allocateClassPair(originalClass, subclassName.UTF8String, 0);
    if (!subclass) {
      return;
    }

    Method original = class_getInstanceMethod(originalClass, @selector(hitTest:withEvent:));
    if (original) {
      // Get the original implementation to call it
      IMP originalImp = method_getImplementation(original);
      UIView *(*originalHitTest)(id, SEL, CGPoint, UIEvent *) =
          (UIView * (*)(id, SEL, CGPoint, UIEvent *)) originalImp;

      IMP fixedHitTestImp = imp_implementationWithBlock(
          ^UIView *(__unsafe_unretained UIView *self, CGPoint point, UIEvent *event) {
            // Call the original implementation
            UIView *result = originalHitTest(self, @selector(hitTest:withEvent:), point, event);

            // This is the fix: when RN's betterHitTest returns self (the container),
            // return the scrollView instead so touches can reach it
            if (result == self) {
              // Dynamically find the scrollView at hit-test time to handle RN refreshes
              // where the scrollView instance is recreated but the swizzled class persists
              for (UIView *subview in self.subviews) {
                if ([subview isKindOfClass:[UIScrollView class]] &&
                    ![subview isKindOfClass:[UITextView class]]) {
                  return subview;
                }
              }
            }

            return result;
          });

      class_addMethod(
          subclass,
          @selector(hitTest:withEvent:),
          fixedHitTestImp,
          method_getTypeEncoding(original));
    }

    objc_registerClassPair(subclass);
  }

  object_setClass(container, subclass);
}

#pragma mark - View

@interface OneClippingScrollViewDecoratorViewComponentView () <RCTOneClippingScrollViewDecoratorViewViewProtocol>
@end

@implementation OneClippingScrollViewDecoratorViewComponentView {
  __weak UIScrollView *_scrollView;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneClippingScrollViewDecoratorViewProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)prepareForRecycle
{
  Class scrollViewClass = object_getClass(_scrollView);
  if (scrollViewClass && [NSStringFromClass(scrollViewClass) hasPrefix:KCNoScrollRectClassPrefix]) {
    object_setClass(_scrollView, class_getSuperclass(scrollViewClass));
  }
  UIView *container = _scrollView.superview;
  Class containerClass = object_getClass(container);
  if (containerClass && [NSStringFromClass(containerClass) hasPrefix:KCFixedHitTestClassPrefix]) {
    object_setClass(container, class_getSuperclass(containerClass));
  }
  _scrollView = nil;
  [super prepareForRecycle];
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneClippingScrollViewDecoratorViewComponentDescriptor>();
}

- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps
{
  const auto &newViewProps =
      *std::static_pointer_cast<const OneClippingScrollViewDecoratorViewProps>(props);

  self.applyWorkaroundForContentInsetHitTestBug =
      newViewProps.applyWorkaroundForContentInsetHitTestBug;

  [super updateProps:props oldProps:oldProps];
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window) {
#if TARGET_OS_MACCATALYST
    // Catalyst UIScrollView is AppKit-backed; avoid runtime subclassing it.
    return;
#else
    UIScrollView *scrollView = KCFindFirstScrollView(self);
    _scrollView = scrollView;
    KCApplyNoopScrollRectToVisible(scrollView);
    if (self.applyWorkaroundForContentInsetHitTestBug) {
      KCApplyFixedHitTest(scrollView);
    }
#endif
  }
}

Class<RCTComponentViewProtocol> OneClippingScrollViewDecoratorViewComponentViewCls(void)
{
  return OneClippingScrollViewDecoratorViewComponentView.class;
}

@end
