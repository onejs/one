#import "OneKeyboardBackgroundViewComponentView.h"

#import "One-Swift.h"

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

#import "RCTFabricComponentsPlugins.h"

#import <React/RCTView.h>
#import <UIKit/UIKit.h>

using namespace facebook::react;

typedef NS_ENUM(NSInteger, KeyboardBackdropStyle) {
  KeyboardBackdropStyleDark = 2030,
  KeyboardBackdropStyleLight = 3901
};

@protocol KeyboardBackdropViewProtocol <NSObject>
@optional
- (instancetype)initWithFrame:(CGRect)frame style:(long long)style;
- (void)transitionToStyle:(long long)style;
@end

#pragma mark - View

@interface OneKeyboardBackgroundViewComponentView () <RCTOneKeyboardBackgroundViewViewProtocol>
@end

@implementation OneKeyboardBackgroundViewComponentView {
  UIVisualEffectView *_backdropView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneKeyboardBackgroundViewComponentDescriptor>();
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

- (instancetype)initWithFrame:(CGRect)frame
{
  self = [super initWithFrame:frame];
  if (self) {
    static const auto defaultProps = std::make_shared<const OneKeyboardBackgroundViewProps>();
    _props = defaultProps;
    [self setupBackdropView];
  }
  self.clipsToBounds = YES;
  return self;
}

- (void)setupBackdropView
{
  Class BackdropClass = NSClassFromString(@"UIKBBackdropView");
  if (BackdropClass) {
    long long style = (self.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark)
        ? KeyboardBackdropStyleDark
        : KeyboardBackdropStyleLight;

    id<KeyboardBackdropViewProtocol> backdrop =
        (id<KeyboardBackdropViewProtocol>)[BackdropClass alloc];
    backdrop = [backdrop initWithFrame:self.bounds style:style];

    if ([backdrop isKindOfClass:[UIVisualEffectView class]]) {
      _backdropView = (UIVisualEffectView *)backdrop;
      _backdropView.layer.masksToBounds = YES;
      _backdropView.autoresizingMask =
          UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
      _backdropView.frame = self.bounds;
      [self addSubview:_backdropView];
    }
  } else {
    NSLog(@"KeyboardBackdropView class not found");
  }
}

// MARK: child management
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                          index:(NSInteger)index
{
  // preserve slot 0 for blur layer
  [super mountChildComponentView:childComponentView index:index + 1];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                            index:(NSInteger)index
{
  // preserve slot 0 for blur layer
  [super unmountChildComponentView:childComponentView index:index + 1];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];

  if (@available(iOS 12.0, *)) {
    if ([previousTraitCollection
            hasDifferentColorAppearanceComparedToTraitCollection:self.traitCollection]) {
      long long style = (self.traitCollection.userInterfaceStyle == UIUserInterfaceStyleDark)
          ? KeyboardBackdropStyleDark
          : KeyboardBackdropStyleLight;

      if ([_backdropView respondsToSelector:@selector(transitionToStyle:)]) {
        [(id<KeyboardBackdropViewProtocol>)_backdropView transitionToStyle:style];
      }
    }
  }
}

Class<RCTComponentViewProtocol> OneKeyboardBackgroundViewComponentViewCls(void)
{
  return OneKeyboardBackgroundViewComponentView.class;
}

@end
