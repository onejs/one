#import "OneNativeUiMapComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <React/RCTConversions.h>
using namespace facebook::react;

// uniform map (One.UI.Map). markers cross as a struct array and are diffed field
// by field like the generated map bridge; overlays cross as one json string and
// are compared by value. MapKit owns the accessibility tree, so test ids and
// labels stop here the way they do on the video player.
@implementation OneNativeUiMapComponentView {
  OneNativeUiMapView *_nativeView;
  BOOL _markersDirty;
  BOOL _overlaysDirty;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeUiMapComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeUiMapProps>();
    _markersDirty = YES;
    _overlaysDirty = YES;
    _nativeView = [OneNativeUiMapView new];
    self.contentView = _nativeView;
    __weak OneNativeUiMapComponentView *weakSelf = self;
    _nativeView.onCameraMove = ^(double latitude, double longitude, double zoom) {
      OneNativeUiMapComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeUiMapEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeUiMapCameraMove(
          {.latitude = (double)latitude,
           .longitude = (double)longitude,
           .zoom = (double)zoom});
    };
    _nativeView.onMarkerClick = ^(NSString *identifier) {
      OneNativeUiMapComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeUiMapEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeUiMapMarkerClick({.id = std::string(identifier.UTF8String)});
    };
    _nativeView.onMapClick = ^(double latitude, double longitude) {
      OneNativeUiMapComponentView *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf->_eventEmitter) return;
      auto emitter = std::static_pointer_cast<const OneNativeUiMapEventEmitter>(
          strongSelf->_eventEmitter);
      emitter->onNativeUiMapClick(
          {.latitude = (double)latitude, .longitude = (double)longitude});
    };
  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeUiMapProps>(props);
  const auto &previous = *std::static_pointer_cast<const OneNativeUiMapProps>(_props);
  bool markersChanged = _markersDirty || previous.markers.size() != next.markers.size();
  if (!markersChanged)
    for (size_t i = 0; i < next.markers.size(); i++) {
      if (previous.markers[i].id != next.markers[i].id ||
          previous.markers[i].title != next.markers[i].title ||
          previous.markers[i].latitude != next.markers[i].latitude ||
          previous.markers[i].longitude != next.markers[i].longitude ||
          previous.markers[i].tint != next.markers[i].tint) {
        markersChanged = true;
        break;
      }
    }
  if (markersChanged) {
    NSMutableArray *markers = [NSMutableArray new];
    for (const auto &item : next.markers)
      [markers addObject:@{
        @"id" : RCTNSStringFromString(item.id),
        @"title" : RCTNSStringFromString(item.title),
        @"latitude" : @(item.latitude),
        @"longitude" : @(item.longitude),
        @"tint" : RCTNSStringFromString(item.tint)
      }];
    [_nativeView setMarkers:markers];
    _markersDirty = NO;
  }
  if (_overlaysDirty || previous.overlays != next.overlays) {
    [_nativeView setOverlays:RCTNSStringFromString(next.overlays)];
    _overlaysDirty = NO;
  }
  [_nativeView configure:next.latitude longitude:next.longitude zoom:next.zoom];
  [super updateProps:props oldProps:oldProps];
}
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_nativeView reset];
  _markersDirty = YES;
  _overlaysDirty = YES;
}
@end
