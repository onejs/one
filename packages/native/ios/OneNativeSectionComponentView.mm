#import "OneNativeSectionComponentView.h"
#import <React/RCTView.h>
#import "VxrnNative-Swift.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneNativeSectionComponentView {
  OneNativeSectionView *_sectionView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativeSectionComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativeSectionProps>();
    _sectionView = [OneNativeSectionView new];
    self.container = _sectionView;
    self.contentView = _sectionView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativeSectionProps>(props);
  [_sectionView configureWithTitle:RCTNSStringFromString(next.title)
                            footer:RCTNSStringFromString(next.footer)
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
