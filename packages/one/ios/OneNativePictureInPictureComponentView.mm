#import "OneNativePictureInPictureComponentView.h"
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
using namespace facebook::react;

// uniform picture in picture (One.UI.PictureInPicture). the display layer view
// that feeds the pip window is subview 0, behind the react children, so every
// child index shifts up by one on mount and unmount.
@implementation OneNativePictureInPictureComponentView {
  OneNativePictureInPicture *_pip;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePictureInPictureComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePictureInPictureProps>();
    _pip = [[OneNativePictureInPicture alloc] initWithHost:self];
    _pip.layerView.frame = self.bounds;
    [self insertSubview:_pip.layerView atIndex:0];
    __weak OneNativePictureInPictureComponentView *weakSelf = self;
    _pip.onChange = ^(BOOL active) {
      OneNativePictureInPictureComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      std::static_pointer_cast<const OneNativePictureInPictureEventEmitter>(strongSelf->_eventEmitter)
          ->onNativePictureInPictureChange({.active = (bool)active});
    };
  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePictureInPictureProps>(props);
  [super updateProps:props oldProps:oldProps];
  [_pip configureWithActive:next.active autoEnter:next.autoEnter];
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [super mountChildComponentView:child index:index + 1];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [super unmountChildComponentView:child index:index + 1];
}
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_pip reset];
}
@end
