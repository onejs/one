#include <cmath>
#import "OneNativeHostComponentView.h"
#import "OneNative-Swift.h"
#import "OneNativeHostShadowNode.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeHostComponentView {
  OneNativeHostView *_hostView;
  OneNativeHostShadowNode::ConcreteState::Shared _state;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeHostProps>();
    _hostView = [OneNativeHostView new];
    self.contentView = _hostView;
    __weak OneNativeHostComponentView *weakSelf = self;
    _hostView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
  }
  return self;
}

// a composed child renders inside this host's SwiftUI tree, so it is published rather
// than added as a subview. nothing ever displays the child's own UIView. the control
// itself is the component view's contentView, which is what conforms to the protocol.
- (UIView *)composableFor:(UIView<RCTComponentViewProtocol> *)child {
  UIView *content = [child isKindOfClass:RCTViewComponentView.class] ? ((RCTViewComponentView *)child).contentView : nil;
  NSAssert(content != nil, @"Swift.Host children must be One Native controls");
  return content;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_hostView insertChild:[self composableFor:child] at:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_hostView removeChild:[self composableFor:child]];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeHostProps>(props);
  [_hostView configureWithAxis:RCTNSStringFromString(next.axis)
                       spacing:next.spacing
                     alignment:RCTNSStringFromString(next.alignment)];
  [super updateProps:props oldProps:oldProps];
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _state = std::static_pointer_cast<const OneNativeHostShadowNode::ConcreteState>(state);
}

- (void)updateMeasuredHeight:(CGFloat)height {
  if (!_state || !std::isfinite(height)) return;
  const auto &old = _state->getData();
  if (old.measured && std::abs(old.height - (Float)height) < 0.5) return;
  OneNativeHostState data;
  data.height = (Float)height;
  data.measured = true;
  _state->updateState(std::move(data));
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_hostView reset];
  _state.reset();
}

@end
