#import "OneNativeSectionComponentView.h"
#import "OneNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeSectionComponentView {
  OneNativeSectionView *_sectionView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSectionComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSectionProps>();
    _sectionView = [OneNativeSectionView new];
    self.container = _sectionView;
    self.contentView = _sectionView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSectionProps>(props);
  [_sectionView configureWithTitle:RCTNSStringFromString(next.title)
                            footer:RCTNSStringFromString(next.footer)];
  [super updateProps:props oldProps:oldProps];
}

@end
