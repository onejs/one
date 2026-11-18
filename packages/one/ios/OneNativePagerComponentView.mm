#import "OneNativePagerComponentView.h"
#import "OneNativePagerView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface OneNativePagerComponentView () <RCTOneNativePagerViewProtocol>
@end

@implementation OneNativePagerComponentView {
  OneNativePagerView *_nativeView;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePagerComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePagerProps>();
    _nativeView = [OneNativePagerView new];
    self.contentView = _nativeView;
    __weak OneNativePagerComponentView *weakSelf = self;
    _nativeView.onScroll = ^(NSInteger position, CGFloat offset) {
      OneNativePagerComponentView *owner = weakSelf;
      if (!owner || !owner->_eventEmitter) return;
      std::static_pointer_cast<const OneNativePagerEventEmitter>(owner->_eventEmitter)->onPageScroll({.position = (int)position, .offset = (double)offset});
    };
    _nativeView.onSelected = ^(NSInteger position) {
      OneNativePagerComponentView *owner = weakSelf;
      if (!owner || !owner->_eventEmitter) return;
      std::static_pointer_cast<const OneNativePagerEventEmitter>(owner->_eventEmitter)->onPageSelected({.position = (int)position});
    };
    _nativeView.onStateChange = ^(NSString *state) {
      OneNativePagerComponentView *owner = weakSelf;
      if (!owner || !owner->_eventEmitter) return;
      std::static_pointer_cast<const OneNativePagerEventEmitter>(owner->_eventEmitter)->onPageScrollStateChanged({.pageScrollState = std::string(state.UTF8String)});
    };
  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePagerProps>(props);
  [_nativeView configureWithInitialPage:next.initialPage scrollEnabled:next.scrollEnabled
      vertical:next.orientation == OneNativePagerOrientation::Vertical
      rtl:next.layoutDirection == OneNativePagerLayoutDirection::Rtl
      pageMargin:next.pageMargin overdrag:next.overdrag
      dismissKeyboardOnDrag:next.keyboardDismissMode == OneNativePagerKeyboardDismissMode::OnDrag];
  [super updateProps:props oldProps:oldProps];
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_nativeView mountPage:child atIndex:index];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_nativeView unmountPage:child];
}
- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask {
  [super finalizeUpdates:updateMask];
  [_nativeView setNeedsLayout];
}
- (void)setPage:(NSInteger)index { [_nativeView setPage:index]; }
- (void)setPageWithoutAnimation:(NSInteger)index { [_nativeView setPageWithoutAnimation:index]; }
- (void)setScrollEnabledImperatively:(BOOL)enabled { [_nativeView setScrollEnabledImperatively:enabled]; }
- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCTOneNativePagerHandleCommand(self, commandName, args);
}
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
}
@end
