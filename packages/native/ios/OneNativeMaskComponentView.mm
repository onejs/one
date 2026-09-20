#import "OneNativeMaskComponentView.h"

#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

// Arbitrary-element mask (UI.Mask, masked-view compatible). The first React
// child is the mask element: it is steered to UIView.maskView (rendered
// offscreen by Core Animation, live — no snapshotting) instead of the view
// hierarchy, so it never displays. Remaining children mount normally with
// indices shifted down by one; unmount mirrors the shift. Reorders arrive
// as unmount+mount pairs, so index-based steering stays consistent.
@implementation OneNativeMaskComponentView

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeMaskComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneNativeMaskProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  [super updateProps:props oldProps:oldProps];
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (index == 0) {
    self.maskView = (UIView *)child;
  } else {
    [super mountChildComponentView:child index:index - 1];
  }
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (index == 0) {
    if (self.maskView == (UIView *)child) {
      self.maskView = nil;
    }
  } else {
    [super unmountChildComponentView:child index:index - 1];
  }
}

@end
