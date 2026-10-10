#import "OneSwiftHostComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneSwiftHostShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneSwiftHostComponentView {
  OneSwiftHostView *_hostView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneSwiftHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneSwiftHostProps>();
    _hostView = [OneSwiftHostView new];
    self.container = _hostView;
    self.contentView = _hostView;
    __weak OneSwiftHostComponentView *weakSelf = self;
    _hostView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
    _hostView.onEvent = ^(NSString *name, NSString *args) {
      OneSwiftHostComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneSwiftHostEventEmitter>(strongSelf->_eventEmitter);
      emitter->onHostEvent({.name = std::string(name.UTF8String), .args = std::string(args.UTF8String)});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneSwiftHostProps>(props);
  [_hostView configureWithPackageName:RCTNSStringFromString(next.packageName)
                                 view:RCTNSStringFromString(next.view)
                         contractHash:RCTNSStringFromString(next.contractHash)
                                props:RCTNSStringFromString(next.props)
                                 fill:next.fill];
  [super updateProps:props oldProps:oldProps];
}

@end
