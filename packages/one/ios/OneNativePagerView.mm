#import "OneNativePagerView.h"

@interface OneNativePagerScrollView : UIScrollView
@end

@implementation OneNativePagerScrollView
- (void)scrollRectToVisible:(CGRect)rect animated:(BOOL)animated {
  // match UIPageViewController's paging scroll view: reveals never move it between pages.
}
@end

@interface OneNativePagerView () <UIScrollViewDelegate>
@end

@implementation OneNativePagerView {
  UIScrollView *_scroll;
  NSMutableArray<UIView *> *_pages;
  NSInteger _selected;
  NSInteger _requested;
  BOOL _initialized;
  BOOL _geometryChanged;
  BOOL _vertical;
  BOOL _rtl;
  BOOL _scrollEnabled;
  CGFloat _margin;
  CGFloat _stride;
  NSString *_state;
}
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _pages = [NSMutableArray new];
    _scroll = [OneNativePagerScrollView new];
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
- (void)configureWithInitialPage:(NSInteger)initialPage
                 scrollEnabled:(BOOL)scrollEnabled
                      vertical:(BOOL)vertical
                           rtl:(BOOL)rtl
                    pageMargin:(CGFloat)pageMargin
                      overdrag:(BOOL)overdrag
         dismissKeyboardOnDrag:(BOOL)dismissKeyboardOnDrag {
  if (!_initialized) _requested = initialPage;
  rtl = !vertical && rtl;
  _geometryChanged = _geometryChanged || vertical != _vertical || rtl != _rtl || pageMargin != _margin;
  _vertical = vertical;
  _rtl = rtl;
  _margin = pageMargin;
  if (scrollEnabled != _scrollEnabled || !_initialized) _scroll.scrollEnabled = scrollEnabled;
  _scrollEnabled = scrollEnabled;
  _scroll.bounces = overdrag;
  _scroll.keyboardDismissMode = dismissKeyboardOnDrag
      ? UIScrollViewKeyboardDismissModeOnDrag : UIScrollViewKeyboardDismissModeNone;
  [self setNeedsLayout];
}
- (void)mountPage:(UIView *)child atIndex:(NSInteger)index {
  [_pages insertObject:child atIndex:index];
  _geometryChanged = YES;
  [_scroll addSubview:child];
  [self setNeedsLayout];
}
- (void)unmountPage:(UIView *)child {
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
- (void)emitScroll:(NSInteger)position offset:(CGFloat)offset {
  if (_onScroll) _onScroll(position, offset);
}
- (void)selectPage:(NSInteger)position {
  BOOL changed = !_initialized || position != _selected;
  _selected = position;
  if (changed && _onSelected) _onSelected(position);
}
- (void)state:(NSString *)state {
  if ([_state isEqualToString:state]) return;
  _state = state;
  if (_onStateChange) _onStateChange(state);
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
- (void)reset {
  [_scroll setContentOffset:CGPointZero animated:NO];
  _initialized = NO;
  _requested = 0;
  _selected = 0;
  _stride = 0;
  _state = @"idle";
}
@end
