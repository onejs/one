#pragma once

#import <AppKit/AppKit.h>

#include <react/renderer/core/EventEmitter.h>
#include <react/renderer/core/LayoutMetrics.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/State.h>

typedef NS_OPTIONS(NSInteger, OneMacosUpdateMask) {
  OneMacosUpdateMaskNone = 0,
  OneMacosUpdateMaskProps = 1 << 0,
  OneMacosUpdateMaskEventEmitter = 1 << 1,
  OneMacosUpdateMaskState = 1 << 2,
  OneMacosUpdateMaskLayoutMetrics = 1 << 3,
  OneMacosUpdateMaskAll = (1 << 4) - 1,
};

NS_ASSUME_NONNULL_BEGIN

// The AppKit counterpart of RCTComponentViewProtocol: the mounting manager
// drives every mounted view through these calls on the main thread.
@protocol OneMacosComponentView <NSObject>

@property (nonatomic, assign) facebook::react::Tag reactTag;

- (void)mountChildComponentView:(NSView<OneMacosComponentView> *)childView index:(NSInteger)index;
- (void)unmountChildComponentView:(NSView<OneMacosComponentView> *)childView index:(NSInteger)index;
- (void)updateProps:(const facebook::react::Props::Shared &)props
           oldProps:(const facebook::react::Props::Shared &)oldProps;
- (void)updateEventEmitter:(const facebook::react::EventEmitter::Shared &)eventEmitter;
- (void)updateState:(const facebook::react::State::Shared &)state
           oldState:(const facebook::react::State::Shared &)oldState;
- (void)updateLayoutMetrics:(const facebook::react::LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const facebook::react::LayoutMetrics &)oldLayoutMetrics;
- (void)finalizeUpdates:(OneMacosUpdateMask)updateMask;

@end

// Base view: frame, background, uniform border and radius, opacity, clipping.
// Subclasses override the update calls and call super.
@interface OneMacosViewComponentView : NSView <OneMacosComponentView>
@property (nonatomic, assign) facebook::react::Tag reactTag;
@property (nonatomic, readonly) std::shared_ptr<const facebook::react::Props> props;
@property (nonatomic, readonly) facebook::react::LayoutMetrics layoutMetrics;
@property (nonatomic, readonly) std::shared_ptr<const facebook::react::EventEmitter> eventEmitter;

// subclasses call this when something they paint changed
- (void)setNeedsRender;
@end

NS_ASSUME_NONNULL_END
