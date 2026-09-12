#import "OneNativeContainerComponentView.h"
#import "OneNative-Swift.h"
#import "OneNativeContainerSlotComponentView.h"

@implementation OneNativeContainerComponentView

// a composed child renders inside this container's SwiftUI tree, so it is published
// rather than added as a subview. nothing ever displays the child's own UIView. the
// control itself is the component view's contentView, which is what composes.
- (UIView *)composableFor:(UIView<RCTComponentViewProtocol> *)child {
  // a slot is the exception: SwiftUI displays the slot's own Fabric view, because that
  // is where React Native mounted the subtree.
  if ([child isKindOfClass:OneNativeContainerSlotComponentView.class])
    return ((OneNativeContainerSlotComponentView *)child).slotView;
  UIView *content = [child isKindOfClass:RCTViewComponentView.class] ? ((RCTViewComponentView *)child).contentView : nil;
  // a child with no composable content can never render here, and publication would drop it
  // without saying so. reject it where the mounted node is known, in every build.
  if (content == nil)
    [NSException raise:@"OneNativeInvalidChild"
                format:@"%@ is not a One Native control. A One Native container takes One "
                       @"Native children; wrap React Native content in Swift.Slot.",
                       NSStringFromClass(child.class)];
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
