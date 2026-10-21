#import "OneMacosScrollViewComponentView.h"

#include <react/renderer/components/scrollview/ScrollViewEventEmitter.h>
#include <react/renderer/components/scrollview/ScrollViewProps.h>
#include <react/renderer/components/scrollview/ScrollViewShadowNode.h>

using namespace facebook::react;

@interface OneMacosScrollDocumentView : NSView
@end

@implementation OneMacosScrollDocumentView
- (BOOL)isFlipped
{
  return YES;
}
@end

// scrollEnabled=false hands wheel events to whatever sits behind the view
@interface OneMacosScrollView : NSScrollView
@property (nonatomic, assign) BOOL scrollEnabled;
@end

@implementation OneMacosScrollView
- (void)scrollWheel:(NSEvent *)event
{
  if (_scrollEnabled) {
    [super scrollWheel:event];
  } else {
    [self.nextResponder scrollWheel:event];
  }
}
@end

@implementation OneMacosScrollViewComponentView {
  OneMacosScrollView *_scrollView;
  OneMacosScrollDocumentView *_documentView;
  ScrollViewShadowNode::ConcreteState::Shared _state;
  NSTimeInterval _lastScrollEventTime;
}

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _scrollView = [[OneMacosScrollView alloc] initWithFrame:self.bounds];
    _scrollView.scrollEnabled = YES;
    _scrollView.drawsBackground = NO;
    _scrollView.borderType = NSNoBorder;
    _scrollView.scrollerStyle = NSScrollerStyleOverlay;
    _scrollView.automaticallyAdjustsContentInsets = NO;
    _scrollView.contentView.drawsBackground = NO;
    _scrollView.contentView.postsBoundsChangedNotifications = YES;
    _scrollView.autoresizingMask = NSViewNotSizable;
    _documentView = [[OneMacosScrollDocumentView alloc] initWithFrame:NSZeroRect];
    _scrollView.documentView = _documentView;
    [self addSubview:_scrollView];

    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    [center addObserver:self selector:@selector(scrolled:) name:NSViewBoundsDidChangeNotification object:_scrollView.contentView];
    [center addObserver:self selector:@selector(beganDrag:) name:NSScrollViewWillStartLiveScrollNotification object:_scrollView];
    [center addObserver:self selector:@selector(endedDrag:) name:NSScrollViewDidEndLiveScrollNotification object:_scrollView];
  }
  return self;
}

- (void)dealloc
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
}

- (NSView *)childContainerView
{
  return _documentView;
}

#pragma mark - Updates

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  [super updateProps:props oldProps:oldProps];
  const auto &scrollProps = static_cast<const ScrollViewProps &>(*props);
  _scrollView.scrollEnabled = scrollProps.scrollEnabled;
  _scrollView.hasVerticalScroller = !scrollProps.horizontal && scrollProps.showsVerticalScrollIndicator;
  _scrollView.hasHorizontalScroller = scrollProps.horizontal && scrollProps.showsHorizontalScrollIndicator;
  NSScrollElasticity elasticity = scrollProps.bounces ? NSScrollElasticityAutomatic : NSScrollElasticityNone;
  _scrollView.verticalScrollElasticity = elasticity;
  _scrollView.horizontalScrollElasticity = elasticity;
  _scrollView.contentInsets = NSEdgeInsetsMake(
      scrollProps.contentInset.top, scrollProps.contentInset.left, scrollProps.contentInset.bottom, scrollProps.contentInset.right);

  const auto &oldScrollProps = oldProps ? static_cast<const ScrollViewProps &>(*oldProps) : scrollProps;
  if (oldProps && oldScrollProps.contentOffset != scrollProps.contentOffset) {
    [self scrollToX:scrollProps.contentOffset.x y:scrollProps.contentOffset.y animated:NO];
  }
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const ScrollViewShadowNode::ConcreteState>(state);
  auto contentSize = _state->getData().getContentSize();
  _documentView.frame = NSMakeRect(0, 0, contentSize.width, contentSize.height);
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  _scrollView.frame = self.bounds;
}

#pragma mark - Scrolling

- (NSPoint)clampedOffsetX:(CGFloat)x y:(CGFloat)y
{
  NSSize content = _documentView.frame.size;
  NSSize visible = _scrollView.contentView.bounds.size;
  NSEdgeInsets inset = _scrollView.contentInsets;
  CGFloat maxX = MAX(content.width - visible.width + inset.right, -inset.left);
  CGFloat maxY = MAX(content.height - visible.height + inset.bottom, -inset.top);
  return NSMakePoint(MIN(MAX(x, -inset.left), maxX), MIN(MAX(y, -inset.top), maxY));
}

- (void)scrollToX:(CGFloat)x y:(CGFloat)y animated:(BOOL)animated
{
  NSPoint target = [self clampedOffsetX:x y:y];
  NSClipView *clip = _scrollView.contentView;
  if (animated) {
    [NSAnimationContext runAnimationGroup:^(NSAnimationContext *context) {
      context.duration = 0.25;
      [clip.animator setBoundsOrigin:target];
    }];
  } else {
    [clip scrollToPoint:target];
    [_scrollView reflectScrolledClipView:clip];
  }
}

- (void)handleCommand:(const std::string &)commandName args:(const folly::dynamic &)args
{
  if (commandName == "scrollTo" && args.size() >= 3) {
    [self scrollToX:args[0].asDouble() y:args[1].asDouble() animated:args[2].asBool()];
  } else if (commandName == "scrollToEnd" && args.size() >= 1) {
    NSSize content = _documentView.frame.size;
    NSSize visible = _scrollView.contentView.bounds.size;
    BOOL horizontal = static_cast<const ScrollViewProps &>(*self.props).horizontal;
    [self scrollToX:horizontal ? content.width - visible.width : 0
                  y:horizontal ? 0 : content.height - visible.height
           animated:args[0].asBool()];
  } else if (commandName == "flashScrollIndicators") {
    [_scrollView flashScrollers];
  }
}

- (ScrollEvent)scrollEvent
{
  ScrollEvent event;
  NSClipView *clip = _scrollView.contentView;
  NSSize content = _documentView.frame.size;
  event.contentSize = {(Float)content.width, (Float)content.height};
  event.contentOffset = {(Float)clip.bounds.origin.x, (Float)clip.bounds.origin.y};
  event.contentInset = {};
  event.containerSize = {(Float)clip.bounds.size.width, (Float)clip.bounds.size.height};
  event.zoomScale = 1;
  event.timestamp = (Float)NSProcessInfo.processInfo.systemUptime;
  return event;
}

- (std::shared_ptr<const ScrollViewEventEmitter>)scrollEmitter
{
  return std::static_pointer_cast<const ScrollViewEventEmitter>(self.eventEmitter);
}

- (void)scrolled:(NSNotification *)notification
{
  auto emitter = [self scrollEmitter];
  if (!emitter || !self.props) {
    return;
  }
  // scrollEventThrottle is in milliseconds, 0 sends every event
  NSTimeInterval throttle = static_cast<const ScrollViewProps &>(*self.props).scrollEventThrottle / 1000.0;
  NSTimeInterval now = NSProcessInfo.processInfo.systemUptime;
  if (_lastScrollEventTime == 0 || now - _lastScrollEventTime > throttle) {
    _lastScrollEventTime = now;
    emitter->onScroll([self scrollEvent]);
  }
}

- (void)beganDrag:(NSNotification *)notification
{
  if (auto emitter = [self scrollEmitter]) {
    emitter->onScrollBeginDrag([self scrollEvent]);
  }
}

- (void)endedDrag:(NSNotification *)notification
{
  if (auto emitter = [self scrollEmitter]) {
    emitter->onScrollEndDrag(ScrollEndDragEvent([self scrollEvent]));
    emitter->onMomentumScrollEnd([self scrollEvent]);
  }
  if (_state) {
    auto data = _state->getData();
    NSPoint origin = _scrollView.contentView.bounds.origin;
    data.contentOffset = {(Float)origin.x, (Float)origin.y};
    _state->updateState(std::move(data));
  }
}

@end
