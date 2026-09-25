#import "OneNativeReservedRegionsProviderComponentView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>

using namespace facebook::react;

// view-scoped reserved regions. queries UIKit's reservedRegions on this view
// for both kinds, inactive ones included, so every frame is already in the
// provider's own coordinates. UIKit posts no reserved-region change
// notification, so layout, window moves, origin-only moves and hinge updates
// (UIHingeInteraction on this view) schedule the re-query, and an unchanged
// result never emits.
//
// the first reading is flushed synchronously so descendants lay out against
// real regions before the first frame; later readings replace any pending
// one, so a hinge sweep delivers only the latest.
//
// UIViewReservedRegionIdentifier is opaque, so the view hands out stable
// string ids per identifier for as long as it lives.
@implementation OneNativeReservedRegionsProviderComponentView {
  NSArray<NSDictionary *> *_currentRegions;
  NSMutableDictionary<id<NSCopying>, NSString *> *_regionIds;
  BOOL _hasDispatchedRegions;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeReservedRegionsProviderComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeReservedRegionsProviderProps>();
    _regionIds = [NSMutableDictionary new];
#if defined(__IPHONE_27_1) && __IPHONE_OS_VERSION_MAX_ALLOWED >= __IPHONE_27_1
    if (@available(iOS 27.1, *)) {
      __weak __typeof(self) weakSelf = self;
      [self addInteraction:[[UIHingeInteraction alloc]
                               initWithUpdateHandler:^(UIHingeInteraction *, UIHingeInteractionUpdate *) {
                                 [weakSelf setNeedsLayout];
                               }]];
    }
#endif
  }
  return self;
}

- (void)layoutSubviews {
  [super layoutSubviews];
  [self updateRegions];
}

- (void)didMoveToWindow {
  [super didMoveToWindow];
  [self setNeedsLayout];
}

- (void)updateLayoutMetrics:(LayoutMetrics const &)layoutMetrics
           oldLayoutMetrics:(LayoutMetrics const &)oldLayoutMetrics {
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // fabric applies layout through center and bounds, so an origin-only move
  // never reaches layoutSubviews, yet it moves every region in our space.
  if (layoutMetrics.frame.origin != oldLayoutMetrics.frame.origin) {
    [self setNeedsLayout];
  }
}

- (void)updateEventEmitter:(EventEmitter::Shared const &)eventEmitter {
  [super updateEventEmitter:eventEmitter];
  [self setNeedsLayout];
}

- (void)updateRegions {
  if (!self.window || !_eventEmitter || CGSizeEqualToSize(self.bounds.size, CGSizeZero)) {
    return;
  }
  NSMutableArray<NSDictionary *> *regions = [NSMutableArray new];
#if defined(__IPHONE_27_1) && __IPHONE_OS_VERSION_MAX_ALLOWED >= __IPHONE_27_1
  if (@available(iOS 27.1, *)) {
    NSArray<UIViewReservedRegionKind *> *kinds =
        @[ UIViewReservedRegionKind.divisionRegionKind, UIViewReservedRegionKind.occlusionRegionKind ];
    NSArray<NSString *> *names = @[ @"division", @"occlusion" ];
    for (NSUInteger index = 0; index < kinds.count; index++) {
      for (UIViewReservedRegion *region in
           [self reservedRegionsOfKind:kinds[index] options:UIViewReservedRegionQueryOptionsIncludeInactive]) {
        NSString *regionId = _regionIds[region.identifier];
        if (!regionId) {
          regionId = [NSString stringWithFormat:@"%@-%lu", names[index], (unsigned long)_regionIds.count + 1];
          _regionIds[region.identifier] = regionId;
        }
        [regions addObject:@{
          @"id" : regionId,
          @"kind" : names[index],
          @"frame" : [NSValue valueWithCGRect:region.frame],
          @"margins" : [NSValue valueWithUIEdgeInsets:region.margins],
          @"isActive" : @(region.isActive),
        }];
      }
    }
  }
#endif
  if (_hasDispatchedRegions && [_currentRegions isEqualToArray:regions]) {
    return;
  }
  _currentRegions = [regions copy];

  auto payload = folly::dynamic::array();
  for (NSDictionary *region in regions) {
    CGRect frame = [region[@"frame"] CGRectValue];
    UIEdgeInsets margins = [region[@"margins"] UIEdgeInsetsValue];
    payload.push_back(folly::dynamic::object("id", [region[@"id"] UTF8String])(
        "kind", [region[@"kind"] UTF8String])("x", frame.origin.x)("y", frame.origin.y)(
        "width", frame.size.width)("height", frame.size.height)("marginTop", margins.top)(
        "marginLeft", margins.left)("marginBottom", margins.bottom)("marginRight", margins.right)(
        "isActive", [region[@"isActive"] boolValue]));
  }
  auto eventEmitter = _eventEmitter;
  if (_hasDispatchedRegions) {
    eventEmitter->dispatchUniqueEvent(
        "nativeReservedRegionsChange", folly::dynamic::object("regions", std::move(payload)));
    return;
  }
  _hasDispatchedRegions = YES;
  eventEmitter->experimental_flushSync([eventEmitter, regions = std::move(payload)]() mutable {
    eventEmitter->dispatchEvent(
        "nativeReservedRegionsChange",
        folly::dynamic::object("regions", std::move(regions)),
        RawEvent::Category::Discrete);
  });
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  _currentRegions = nil;
  [_regionIds removeAllObjects];
  _hasDispatchedRegions = NO;
}

@end
