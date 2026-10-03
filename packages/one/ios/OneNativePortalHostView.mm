#import "OneNativePortalRegistry.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
using namespace facebook::react;
@implementation OneNativePortalHostViewComponentView
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePortalHostViewComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) _props = std::make_shared<const OneNativePortalHostViewProps>();
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePortalHostViewProps>(props);
  NSString *name = @(next.name.c_str());
  BOOL changed = ![self.hostName isEqual:name];
  if (changed) [[OneNativePortalRegistry shared] removeHost:self];
  self.hostName = name;
  [super updateProps:props oldProps:oldProps];
  if (changed) [[OneNativePortalRegistry shared] addHost:self];
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [super mountChildComponentView:child index:index];
  [[OneNativePortalRegistry shared] refresh];
}
- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
  UIView *hit = [super hitTest:point withEvent:event];
  return hit == self ? nil : hit;
}
- (void)layoutSubviews { [super layoutSubviews]; [[OneNativePortalRegistry shared] publishLayouts]; }
- (void)didMoveToWindow { [super didMoveToWindow]; [[OneNativePortalRegistry shared] refresh]; }
- (void)prepareForRecycle {
  [[OneNativePortalRegistry shared] removeHost:self]; self.hostName = nil;
  [super prepareForRecycle];
}
- (void)dealloc { [[OneNativePortalRegistry shared] removeHost:self]; }
@end
