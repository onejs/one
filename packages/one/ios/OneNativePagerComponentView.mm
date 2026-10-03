#import "OneNativePagerComponentView.h"
#import <react/renderer/components/OneNativeSpec/ComponentDescriptors.h>
#import <react/renderer/components/OneNativeSpec/EventEmitters.h>
#import <react/renderer/components/OneNativeSpec/Props.h>
#import <react/renderer/components/OneNativeSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface OneNativePagerComponentView () <UIScrollViewDelegate, RCTOneNativePagerViewProtocol>
@end

@implementation OneNativePagerComponentView {
  UIScrollView *_scroll;
  NSMutableArray<UIView *> *_pages;
  NSInteger _selected;
  NSInteger _requested;
  BOOL _initialized;
  BOOL _geometryChanged;
  BOOL _vertical;
  BOOL _rtl;
  CGFloat _margin;
  CGFloat _stride;
  NSString *_state;
}
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<OneNativePagerComponentDescriptor>();
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const OneNativePagerProps>();
    _pages = [NSMutableArray new];
    _scroll = [UIScrollView new];
    _scroll.delegate = self;
    _scroll.pagingEnabled = YES;
    _scroll.directionalLockEnabled = YES;
    _scroll.showsHorizontalScrollIndicator = NO;
    _scroll.showsVerticalScrollIndicator = NO;
    _scroll.contentInsetAdjustmentBehavior = UIScrollViewContentInsetAdjustmentNever;
    _scroll.bounces = NO;
    _state = @"idle";
    self.clipsToBounds = YES;
    [self addSubview:_scroll];
  }
  return self;
}
- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &next = *std::static_pointer_cast<const OneNativePagerProps>(props);
  const auto &previous = *std::static_pointer_cast<const OneNativePagerProps>(_props);
  if (!_initialized) _requested = next.initialPage;
  _geometryChanged = _geometryChanged || next.orientation != previous.orientation || next.layoutDirection != previous.layoutDirection || next.pageMargin != previous.pageMargin;
  _vertical = next.orientation == OneNativePagerOrientation::Vertical;
  _rtl = !_vertical && next.layoutDirection == OneNativePagerLayoutDirection::Rtl;
  _margin = next.pageMargin;
  if (next.scrollEnabled != previous.scrollEnabled || !_initialized) _scroll.scrollEnabled = next.scrollEnabled;
  _scroll.bounces = next.overdrag;
  _scroll.keyboardDismissMode = next.keyboardDismissMode == OneNativePagerKeyboardDismissMode::OnDrag
      ? UIScrollViewKeyboardDismissModeOnDrag : UIScrollViewKeyboardDismissModeNone;
  [super updateProps:props oldProps:oldProps];
  [self setNeedsLayout];
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_pages insertObject:child atIndex:index];
  _geometryChanged = YES;
  [_scroll addSubview:child];
  [self setNeedsLayout];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index {
  [_pages removeObject:child];
  _geometryChanged = YES;
  [child removeFromSuperview];
  [self setNeedsLayout];
}
- (CGFloat)physicalPage:(CGFloat)logical {
  return _rtl ? MAX(0, (NSInteger)_pages.count - 1) - logical : logical;
}
- (CGPoint)pointForPage:(NSInteger)page {
  CGFloat offset = [self physicalPage:page] * _stride;
  return _vertical ? CGPointMake(0, offset) : CGPointMake(offset, 0);
}
- (void)layoutSubviews {
  [super layoutSubviews];
  CGFloat nextStride = (_vertical ? self.bounds.size.height : self.bounds.size.width) + _margin;
  if (nextStride <= _margin) return;
  BOOL changed = _stride != nextStride || _geometryChanged;
  _geometryChanged = NO;
  _stride = nextStride;
  _scroll.frame = _vertical ? CGRectMake(0, 0, self.bounds.size.width, _stride)
                           : CGRectMake(0, 0, _stride, self.bounds.size.height);
  _scroll.contentSize = _vertical ? CGSizeMake(self.bounds.size.width, _stride * _pages.count)
                                 : CGSizeMake(_stride * _pages.count, self.bounds.size.height);
  for (NSUInteger index = 0; index < _pages.count; index++) {
    CGPoint point = [self pointForPage:index];
    _pages[index].frame = CGRectMake(point.x, point.y, self.bounds.size.width, self.bounds.size.height);
  }
  if (!_pages.count) return;
  NSInteger target = MIN(MAX(0, _initialized ? _selected : _requested), (NSInteger)_pages.count - 1);
  if (!_initialized || changed || target != _selected) {
    [_scroll setContentOffset:[self pointForPage:target] animated:NO];
    [self selectPage:target];
    _initialized = YES;
    [self emitScroll:target offset:0];
  }
}
- (void)finalizeUpdates:(RNComponentViewUpdateMask)updateMask {
  [super finalizeUpdates:updateMask];
  [self setNeedsLayout];
}
- (void)emitScroll:(NSInteger)position offset:(CGFloat)offset {
  if (!_eventEmitter) return;
  std::static_pointer_cast<const OneNativePagerEventEmitter>(_eventEmitter)->onPageScroll({.position = (int)position, .offset = (double)offset});
}
- (void)selectPage:(NSInteger)position {
  BOOL changed = !_initialized || position != _selected;
  _selected = position;
  if (changed && _eventEmitter)
    std::static_pointer_cast<const OneNativePagerEventEmitter>(_eventEmitter)->onPageSelected({.position = (int)position});
}
- (void)state:(NSString *)state {
  if ([_state isEqualToString:state]) return;
  _state = state;
  if (_eventEmitter)
    std::static_pointer_cast<const OneNativePagerEventEmitter>(_eventEmitter)->onPageScrollStateChanged({.pageScrollState = std::string(state.UTF8String)});
}
- (void)settled {
  if (!_pages.count || _stride <= 0) return;
  CGFloat physical = (_vertical ? _scroll.contentOffset.y : _scroll.contentOffset.x) / _stride;
  NSInteger page = MIN(MAX(0, (NSInteger)llround([self physicalPage:physical])), (NSInteger)_pages.count - 1);
  [self selectPage:page];
  [self emitScroll:page offset:0];
  [self state:@"idle"];
}
- (void)scrollViewDidScroll:(UIScrollView *)scrollView {
  if (!_initialized || !_pages.count || _stride <= 0) return;
  CGFloat physical = (_vertical ? scrollView.contentOffset.y : scrollView.contentOffset.x) / _stride;
  CGFloat logical = MIN(MAX(0, [self physicalPage:physical]), (CGFloat)_pages.count - 1);
  NSInteger position = floor(logical);
  [self emitScroll:position offset:logical - position];
}
- (void)scrollViewWillBeginDragging:(UIScrollView *)scrollView { [self state:@"dragging"]; }
- (void)scrollViewDidEndDragging:(UIScrollView *)scrollView willDecelerate:(BOOL)decelerate {
  if (decelerate) [self state:@"settling"]; else [self settled];
}
- (void)scrollViewDidEndDecelerating:(UIScrollView *)scrollView { [self settled]; }
- (void)scrollViewDidEndScrollingAnimation:(UIScrollView *)scrollView { [self settled]; }
- (void)goTo:(NSInteger)index animated:(BOOL)animated {
  if (index < 0) return;
  if (!_initialized) { _requested = index; return; }
  if (index >= _pages.count) return;
  CGPoint target = [self pointForPage:index];
  if (CGPointEqualToPoint(target, _scroll.contentOffset)) { [self settled]; return; }
  if (animated) [self state:@"settling"];
  [_scroll setContentOffset:target animated:animated];
  if (!animated) [self settled];
}
- (void)setPage:(NSInteger)index { [self goTo:index animated:YES]; }
- (void)setPageWithoutAnimation:(NSInteger)index { [self goTo:index animated:NO]; }
- (void)setScrollEnabledImperatively:(BOOL)enabled { _scroll.scrollEnabled = enabled; }
- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args {
  RCTOneNativePagerHandleCommand(self, commandName, args);
}
- (void)prepareForRecycle {
  [super prepareForRecycle];
  [_scroll setContentOffset:CGPointZero animated:NO];
  _initialized = NO;
  _requested = 0;
  _selected = 0;
  _stride = 0;
  _state = @"idle";
}
@end
