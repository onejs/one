#import "OneNativeEdgeFadeComponentView.h"
#import "OneNativeEdgeFadeView.h"

#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface RCTViewComponentView (OneNativeEdgeFadeInvalidation)
- (void)invalidateLayer;
@end

@implementation OneNativeEdgeFadeComponentView {
  OneNativeEdgeFadeView *_nativeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeEdgeFadeComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const OneNativeEdgeFadeProps>();
    _props = defaultProps;
    _nativeView = [OneNativeEdgeFadeView new];
    [_nativeView attachToView:self];
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<OneNativeEdgeFadeProps const>(props);
  [_nativeView configureWithFadeTop:next.fadeTop
                          fadeBottom:next.fadeBottom
                            fadeLeft:next.fadeLeft
                           fadeRight:next.fadeRight
                            curveTop:[NSString stringWithUTF8String:next.curveTop.c_str()]
                         curveBottom:[NSString stringWithUTF8String:next.curveBottom.c_str()]
                           curveLeft:[NSString stringWithUTF8String:next.curveLeft.c_str()]
                          curveRight:[NSString stringWithUTF8String:next.curveRight.c_str()]
                          fadeRadius:next.fadeRadius
                                mode:[NSString stringWithUTF8String:next.mode.c_str()]
                          blurRadius:next.blurRadius
                    frostProgression:next.frostProgression
                        overlayColor:next.overlayColor];
  [super updateProps:props oldProps:oldProps];
}

- (void)didMoveToWindow {
  [super didMoveToWindow];
  [_nativeView syncLayerScales];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection {
  [super traitCollectionDidChange:previousTraitCollection];
  [_nativeView syncLayerScales];
}

- (void)layoutSubviews {
  [super layoutSubviews];
  [_nativeView updateLayout];
}

// fabric's border and clipping pass clears layer.mask.
- (void)invalidateLayer {
  [super invalidateLayer];
  [_nativeView restoreMask];
}

- (void)didAddSubview:(UIView *)subview {
  [super didAddSubview:subview];
  [_nativeView contentAdded:subview];
}
@end
