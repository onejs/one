#import "OneKeyboardToolbarGroupViewComponentView.h"

#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>

#import "RCTFabricComponentsPlugins.h"

#import <UIKit/UIKit.h>

using namespace facebook::react;

// MARK: View
@interface OneKeyboardToolbarGroupViewComponentView () <RCTOneKeyboardToolbarGroupViewViewProtocol>
@end

@implementation OneKeyboardToolbarGroupViewComponentView {
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<OneKeyboardToolbarGroupViewComponentDescriptor>();
}

// Needed because of this: https://github.com/facebook/react-native/pull/37274
+ (void)load
{
  [super load];
}

// MARK: Constructor
- (instancetype)init
{
  if (self = [super init]) {
    static const auto defaultProps = std::make_shared<const OneKeyboardToolbarGroupViewProps>();
    _props = defaultProps;
  }
  return self;
}

Class<RCTComponentViewProtocol> OneKeyboardToolbarGroupViewComponentViewCls(void)
{
  return OneKeyboardToolbarGroupViewComponentView.class;
}

@end
