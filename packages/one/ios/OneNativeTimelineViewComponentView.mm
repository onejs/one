#import "OneNativeTimelineViewComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneNativeContainerStyle.h"
#import "OneNativeTimelineViewShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeTimelineViewComponentView {
  OneNativeTimelineViewView *_timeline;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeTimelineViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeTimelineViewProps>();
    _timeline = [OneNativeTimelineViewView new];
    self.container = _timeline;
    OneNativeForwardSwiftStyleEvents<OneNativeTimelineViewEventEmitter>(self);
    self.contentView = _timeline;
    __weak OneNativeTimelineViewComponentView *weakSelf = self;
    _timeline.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
    _timeline.onTick = ^(double time, NSString *cadence) {
      OneNativeTimelineViewComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeTimelineViewEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeTimelineViewTick({.time = time, .cadence = std::string(cadence.UTF8String)});
    };
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeTimelineViewProps>(props);
  [_timeline configureSwiftStyle:OneNativeStyleDictionary(next.swiftStyle)];
  [_timeline configureWithSchedule:RCTNSStringFromString(next.schedule) startDate:next.startDate interval:next.interval dates:RCTNSStringFromString(next.dates)];
  [super updateProps:props oldProps:oldProps];
}

@end
