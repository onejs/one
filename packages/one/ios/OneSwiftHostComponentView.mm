#import "OneSwiftHostComponentView.h"
#import <React/RCTView.h>
#import "One-Swift.h"
#import "OneSwiftHostShadowNode.h"
#import <React/RCTConversions.h>

using namespace facebook::react;

@implementation OneSwiftHostComponentView {
  OneSwiftHostView *_hostView;
  // events raised while no emitter is attached (updateProps runs before
  // updateEventEmitter on a new view), flushed once it is
  NSMutableArray<NSArray<NSString *> *> *_pendingEvents;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneSwiftHostComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneSwiftHostProps>();
    _hostView = [OneSwiftHostView new];
    self.container = _hostView;
    self.contentView = _hostView;
    __weak OneSwiftHostComponentView *weakSelf = self;
    _hostView.onMeasure = ^(CGFloat height) {
      [weakSelf updateMeasuredHeight:height];
    };
    _hostView.onEvent = ^(NSString *name, NSString *args) {
      [weakSelf emitHostEvent:name args:args];
    };
  }
  return self;
}

- (void)emitHostEvent:(NSString *)name args:(NSString *)args {
  if (!_eventEmitter) {
    if (!_pendingEvents) _pendingEvents = [NSMutableArray new];
    [_pendingEvents addObject:@[name, args]];
    return;
  }
  auto emitter = std::static_pointer_cast<const OneSwiftHostEventEmitter>(_eventEmitter);
  emitter->onHostEvent({.name = std::string(name.UTF8String), .args = std::string(args.UTF8String)});
}

- (void)updateEventEmitter:(EventEmitter::Shared const &)eventEmitter {
  [super updateEventEmitter:eventEmitter];
  NSArray<NSArray<NSString *> *> *pending = _pendingEvents;
  _pendingEvents = nil;
  for (NSArray<NSString *> *event in pending) [self emitHostEvent:event[0] args:event[1]];
}

// a recycled view starts over: held props and events belong to the last owner
- (void)prepareForRecycle {
  _pendingEvents = nil;
  [_hostView dropHeldProps];
  [super prepareForRecycle];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneSwiftHostProps>(props);
  [_hostView configureWithPackageName:RCTNSStringFromString(next.packageName)
                                 view:RCTNSStringFromString(next.view)
                         contractHash:RCTNSStringFromString(next.contractHash)
                                props:RCTNSStringFromString(next.props)
                                 fill:next.fill];
  [super updateProps:props oldProps:oldProps];
}

@end
