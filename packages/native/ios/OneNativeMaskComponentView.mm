#import "OneNativeMaskComponentView.h"

#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

// `invalidateLayer` exists on RCTViewComponentView (it runs the border and
// clipping pipeline, which unconditionally clears the layer mask) but is not
// in the public header on 0.87, so declare it to override visibly.
@interface RCTViewComponentView (OneNativeMaskInvalidation)
- (void)invalidateLayer;
@end

// Arbitrary-element mask (UI.Mask, masked-view compatible). The first React
// child is the mask element: its layer becomes self.layer.mask (rendered
// live by Core Animation, no snapshotting) instead of joining the view
// hierarchy, so it never displays. Remaining children mount normally with
// indices shifted down by one; unmount mirrors the shift. Reorders arrive
// as unmount+mount pairs, so index-based steering stays consistent.
//
// The mask child is held strongly: it never joins a superview, so nothing
// else retains it. UIView.maskView is deliberately NOT used — steering a
// Fabric-managed view into it leaves a freed view in a live subviews array
// and crashes the next UIKit subtree traversal (EXC_BAD_ACCESS in
// _backing_sublayers); the layer is immune because CALayer.mask retains it.
@implementation OneNativeMaskComponentView {
  UIView *_maskChild;
}

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
    _maskChild = (UIView *)child;
    self.layer.mask = _maskChild.layer;
  } else {
    [super mountChildComponentView:child index:index - 1];
  }
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  if (index == 0) {
    if (_maskChild == (UIView *)child) {
      if (self.layer.mask == _maskChild.layer) {
        self.layer.mask = nil;
      }
      _maskChild = nil;
    }
  } else {
    [super unmountChildComponentView:child index:index - 1];
  }
}

// RCTViewComponentView.invalidateLayer resets the layer mask to nil during its
// border/clipping pipeline. Re-apply ours after super has finished.
- (void)invalidateLayer {
  [super invalidateLayer];
  if (_maskChild && self.layer.mask != _maskChild.layer) {
    self.layer.mask = _maskChild.layer;
  }
}

- (void)layoutSubviews {
  [super layoutSubviews];
  // heal the mask if core's clipping pipeline cleared it without running
  // our invalidateLayer override (renamed selector on a future RN).
  if (_maskChild && self.layer.mask != _maskChild.layer) {
    self.layer.mask = _maskChild.layer;
  }
}

@end
