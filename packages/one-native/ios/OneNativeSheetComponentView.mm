#import "OneNativeSheetComponentView.h"
#import "OneNative-Swift.h"
#import "OneNativeSheetContentShadowNode.h"
#import <React/RCTSurfaceTouchHandler.h>
#import <React/RCTConversions.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#include <cmath>
using namespace facebook::react;

@implementation OneNativeSheetComponentView { OneNativeSheetView *_sheet; BOOL _detentsDirty; }
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<OneNativeSheetComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSheetProps>();
    _detentsDirty = YES;
    _sheet = [OneNativeSheetView new]; self.contentView = _sheet;
    __weak OneNativeSheetComponentView *weakSelf = self;
    _sheet.onChange = ^(BOOL value, NSInteger eventCount, NSInteger revision) {
      OneNativeSheetComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSheetEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSheetIsPresentedChange({.isPresented = (bool)value, .eventCount = (int)eventCount, .revision = (int)revision});
    };
    _sheet.onDismiss = ^(NSInteger revision) {
      OneNativeSheetComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeSheetEventEmitter>(strongSelf->_eventEmitter);
      emitter->onNativeSheetDismiss({.revision = (int)revision});
    };
  }
  return self;
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  __weak OneNativeSheetContentComponentView *weakContent = (OneNativeSheetContentComponentView *)child;
  [_sheet mountContent:child onLayout:^(CGRect frame) { [weakContent updateNativeFrame:frame]; }];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index { [_sheet unmountContent:child]; }
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSheetProps>(props);
  const auto &previous = *std::static_pointer_cast<const OneNativeSheetProps>(_props);
  bool changed = _detentsDirty || next.detents.size() != previous.detents.size();
  if (!changed) for (size_t i = 0; i < next.detents.size(); i++) {
    if (next.detents[i].type != previous.detents[i].type || next.detents[i].value != previous.detents[i].value) { changed = true; break; }
  }
  if (changed) {
    NSMutableArray *detents = [NSMutableArray new];
    for (const auto &detent : next.detents) [detents addObject:@{@"type": RCTNSStringFromString(detent.type), @"value": @(detent.value)}];
    [_sheet setDetents:detents];
    _detentsDirty = NO;
  }
  [_sheet configure:next.isPresented acknowledgedEvent:next.acknowledgedEvent revision:next.revision
    interactiveDismissDisabled:next.interactiveDismissDisabled presentationDragIndicator:RCTNSStringFromString(next.presentationDragIndicator)
    presentation:RCTNSStringFromString(next.presentation)];
  [super updateProps:props oldProps:oldProps];
}
- (void)prepareForRecycle { [super prepareForRecycle]; [_sheet reset]; _detentsDirty = YES; }
@end

@implementation OneNativeSheetContentComponentView {
  OneNativeSheetContentShadowNode::ConcreteState::Shared _slotState;
  RCTSurfaceTouchHandler *_touchHandler;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider { return concreteComponentDescriptorProvider<OneNativeSheetContentComponentDescriptor>(); }
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSheetContentProps>();
    // presentation leaves the RN surface, as it does for React Native's Modal.
    _touchHandler = [RCTSurfaceTouchHandler new]; [_touchHandler attachToView:self];
  }
  return self;
}
- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  _slotState = std::static_pointer_cast<const OneNativeSheetContentShadowNode::ConcreteState>(state);
}
- (void)updateNativeFrame:(CGRect)frame {
  if (!_slotState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;
  const auto &old = _slotState->getData();
  const facebook::react::Size size{(Float)frame.size.width, (Float)frame.size.height};
  if (old.measured && old.size == size) return;
  OneNativeSlotState state; state.size = size; state.measured = true;
  _slotState->updateState(std::move(state));
}
- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  self.frame = (CGRect){CGPointZero, self.bounds.size};
}
- (void)prepareForRecycle { [super prepareForRecycle]; _touchHandler.enabled = NO; _touchHandler.enabled = YES; _slotState.reset(); }
@end
