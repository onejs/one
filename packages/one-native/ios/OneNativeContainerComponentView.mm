#import "OneNativeContainerComponentView.h"
#import "OneNative-Swift.h"

@implementation OneNativeContainerComponentView

// a composed child renders inside this container's SwiftUI tree, so it is published
// rather than added as a subview. nothing ever displays the child's own UIView. the
// control itself is the component view's contentView, which is what composes.
- (UIView *)composableFor:(UIView<RCTComponentViewProtocol> *)child {
  UIView *content = [child isKindOfClass:RCTViewComponentView.class] ? ((RCTViewComponentView *)child).contentView : nil;
  NSAssert(content != nil, @"One Native containers take One Native children");
  return content;
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_container insertChild:[self composableFor:child] at:index];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_container removeChild:[self composableFor:child]];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_container reset];
}

@end
