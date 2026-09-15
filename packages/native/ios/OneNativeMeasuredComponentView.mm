#import "OneNativeMeasuredComponentView.h"
#import "OneNativeMeasuredHeight.h"

using namespace facebook::react;

@implementation OneNativeMeasuredComponentView {
  OneNativeMeasuredHeight *_measured;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) _measured = [OneNativeMeasuredHeight new];
  return self;
}

- (void)updateState:(State::Shared const &)state oldState:(State::Shared const &)oldState {
  [_measured adopt:state];
}

- (void)updateMeasuredHeight:(CGFloat)height {
  [_measured update:height];
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_measured reset];
}

@end
