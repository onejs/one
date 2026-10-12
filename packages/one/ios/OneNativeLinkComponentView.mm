#import "OneNativeLinkComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeLinkComponentView {
  OneNativeLinkView *_linkView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeLinkComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeLinkProps>();
    _linkView = [OneNativeLinkView new];
    self.container = _linkView;
    self.contentView = _linkView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeLinkProps>(props);
  [_linkView configureWithDestination:RCTNSStringFromString(next.destination)
                                label:RCTNSStringFromString(next.label)];
  [super updateProps:props oldProps:oldProps];
}

@end
