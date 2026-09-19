#import "OneNativeSwipeActionsComponentView.h"
#import "OneNativeSwipeActionsActionsComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeSwipeActionsComponentView {
  OneNativeSwipeActionsView *_swipeView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSwipeActionsComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSwipeActionsProps>();
    _swipeView = [OneNativeSwipeActionsView new];
    self.container = _swipeView;
    self.contentView = _swipeView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  [super updateProps:props oldProps:oldProps];
}

@end

@implementation OneNativeSwipeActionsActionsComponentView

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSwipeActionsActionsComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSwipeActionsActionsProps>();
    OneNativeSwipeActionsActionsView *actionsView = [OneNativeSwipeActionsActionsView new];
    self.container = actionsView;
    self.contentView = actionsView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSwipeActionsActionsProps>(props);
  OneNativeSwipeActionsActionsView *actionsView =
    (OneNativeSwipeActionsActionsView *)self.contentView;
  [actionsView configureWithEdge:RCTNSStringFromString(next.edge)
                allowsFullSwipe:next.allowsFullSwipe];
  [super updateProps:props oldProps:oldProps];
}

@end
