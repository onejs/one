#import "OneNativeGlassComponentView.h"
#import "OneNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeGlassComponentView {
  OneNativeGlassView *_glassView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeGlassComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeGlassProps>();
    _glassView = [OneNativeGlassView new];
    self.container = _glassView;
    self.contentView = _glassView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeGlassProps>(props);
  // an omitted colour prop arrives as the null shared colour, which has no colour to convert.
  UIColor *tint = next.tint ? RCTUIColorFromSharedColor(next.tint) : nil;
  [_glassView configureWithMaterial:RCTNSStringFromString(next.material)
                        glassEffect:RCTNSStringFromString(next.glassEffect)
                       cornerRadius:next.cornerRadius
                               tint:tint];
  [super updateProps:props oldProps:oldProps];
}

@end
