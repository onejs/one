#import "OneNativeSectionComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>
#import "OneNativeStyleDictionary.h"

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
    __weak OneNativeSectionComponentView *weakSelf = self;
    _sectionView.onSDKEvent = ^(NSString *name, NSString *value) {
      OneNativeSectionComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSectionEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSDKEvent({.name = std::string(name.UTF8String), .value = std::string(value.UTF8String)});
    };
    self.container = _sectionView;
    self.contentView = _sectionView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSectionProps>(props);
  [_sectionView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_sectionView configureWithTitle:RCTNSStringFromString(next.title)
                            footer:RCTNSStringFromString(next.footer)];
  [super updateProps:props oldProps:oldProps];
}

@end
