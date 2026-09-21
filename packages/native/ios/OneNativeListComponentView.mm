#import "OneNativeListComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeListComponentView {
  OneNativeListView *_listView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeListComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeListProps>();
    _listView = [OneNativeListView new];
    self.container = _listView;
    self.contentView = _listView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeListProps>(props);
  [_listView configureWithListStyle:RCTNSStringFromString(next.listStyle)
                 listRowSeparator:RCTNSStringFromString(next.listRowSeparator)
            listRowSeparatorEdges:RCTNSStringFromString(next.listRowSeparatorEdges)
                 listRowInsetsTop:next.listRowInsetsTop
             listRowInsetsLeading:next.listRowInsetsLeading
              listRowInsetsBottom:next.listRowInsetsBottom
            listRowInsetsTrailing:next.listRowInsetsTrailing
               listSectionSpacing:RCTNSStringFromString(next.listSectionSpacing)
          listSectionSpacingValue:next.listSectionSpacingValue
         listSectionMarginsLength:next.listSectionMarginsLength
          listSectionMarginsEdges:RCTNSStringFromString(next.listSectionMarginsEdges)
                 headerProminence:RCTNSStringFromString(next.headerProminence)];
  [super updateProps:props oldProps:oldProps];
}

@end
