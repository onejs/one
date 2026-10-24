#import "OneMacosComponentView.h"

#include <react/renderer/components/view/BaseViewEventEmitter.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/components/view/accessibilityPropsConversions.h>
#include <react/renderer/components/view/conversions.h>
#include <cmath>

#import "OneMacosText.h"

using namespace facebook::react;

namespace {

// css angles are clockwise from up, in appkit's flipped drawing coordinates.
static void DrawLinearGradient(const LinearGradient &gradient, CGRect bounds)
{
  CGFloat width = bounds.size.width;
  CGFloat height = bounds.size.height;
  if (width <= 0 || height <= 0 || gradient.colorStops.size() < 2) {
    return;
  }
  CGFloat angle;
  if (auto degrees = std::get_if<Float>(&gradient.direction)) {
    angle = *degrees * M_PI / 180;
  } else {
    // corner keywords make the adjacent corners share a color (css magic corners).
    CGFloat x = height;
    CGFloat y = width;
    switch (std::get<GradientKeyword>(gradient.direction)) {
      case GradientKeyword::ToTopRight: y = -y; break;
      case GradientKeyword::ToBottomRight: break;
      case GradientKeyword::ToTopLeft: x = -x; y = -y; break;
      case GradientKeyword::ToBottomLeft: x = -x; break;
    }
    angle = std::atan2(x, -y);
  }
  if (!std::isfinite(angle)) {
    return;
  }
  CGFloat dx = std::sin(angle);
  CGFloat dy = -std::cos(angle);
  CGFloat length = std::abs(width * dx) + std::abs(height * dy);
  CGPoint center = CGPointMake(CGRectGetMidX(bounds), CGRectGetMidY(bounds));
  CGPoint start = CGPointMake(center.x - dx * length / 2, center.y - dy * length / 2);

  std::vector<CGFloat> positions;
  NSMutableArray<NSColor *> *colors = [NSMutableArray new];
  CGFloat previous = -INFINITY;
  for (size_t i = 0; i < gradient.colorStops.size(); ++i) {
    const auto &stop = gradient.colorStops[i];
    // transition hints have no color; they are not supported by this host yet.
    if (!stop.color) {
      return;
    }
    NSColor *color = [OneMacosColorFromSharedColor(stop.color) colorUsingColorSpace:NSColorSpace.sRGBColorSpace];
    // pattern colors cannot become gradient components. Leave the layer unpainted.
    if (!color) {
      return;
    }
    [colors addObject:color];
    CGFloat position = NAN;
    if (stop.position) {
      position = stop.position.unit == UnitType::Point ? stop.position.value / length : stop.position.resolve(1);
      if (!std::isfinite(position)) {
        return;
      }
    } else if (i == 0) {
      position = 0;
    } else if (i == gradient.colorStops.size() - 1) {
      position = 1;
    }
    if (!std::isnan(position)) {
      position = std::max(previous, position);
      previous = position;
    }
    positions.push_back(position);
  }
  // distribute each run of omitted positions between its defined neighbors.
  size_t last = 0;
  for (size_t i = 1; i < positions.size(); ++i) {
    if (!std::isnan(positions[i])) {
      for (size_t j = last + 1; j < i; ++j) {
        positions[j] = positions[last] + (positions[i] - positions[last]) * (j - last) / (i - last);
      }
      last = i;
    }
  }
  // core graphics accepts only [0,1] locations. Move the line endpoints rather
  // than clamp stops, which would change gradients with stops outside the box.
  CGFloat first = positions.front();
  CGFloat span = positions.back() - first;
  if (span == 0) {
    // equal positions form a hard transition, including an all-equal stop list.
    span = 1;
  }
  CGPoint end = CGPointMake(start.x + dx * length * (first + span), start.y + dy * length * (first + span));
  start.x += dx * length * first;
  start.y += dy * length * first;
  NSMutableArray *cgColors = [NSMutableArray new];
  std::vector<CGFloat> locations;
  std::vector<size_t> nextVisible(colors.count, colors.count);
  size_t next = colors.count;
  for (size_t i = colors.count; i-- > 0;) {
    nextVisible[i] = next;
    if (colors[i].alphaComponent > 0) {
      next = i;
    }
  }
  NSColor *previousColor = nil;
  for (size_t i = 0; i < positions.size(); ++i) {
    CGFloat location = (positions[i] - first) / span;
    NSColor *color = colors[i];
    // core graphics interpolates unpremultiplied components. Split a clear stop
    // so each adjacent fade keeps its own visible hue, including clear runs.
    if (color.alphaComponent == 0) {
      NSColor *nextColor = nextVisible[i] < colors.count ? colors[nextVisible[i]] : nil;
      if (previousColor || nextColor) {
        NSColor *left = previousColor ?: nextColor;
        NSColor *right = nextColor ?: previousColor;
        [cgColors addObject:(__bridge id)[left colorWithAlphaComponent:0].CGColor];
        locations.push_back(location);
        [cgColors addObject:(__bridge id)[right colorWithAlphaComponent:0].CGColor];
        locations.push_back(location);
        continue;
      }
    } else {
      previousColor = color;
    }
    [cgColors addObject:(__bridge id)color.CGColor];
    locations.push_back(location);
  }
  CGColorSpaceRef space = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
  CGGradientRef nativeGradient = CGGradientCreateWithColors(space, (__bridge CFArrayRef)cgColors, locations.data());
  if (nativeGradient) {
    CGContextDrawLinearGradient(NSGraphicsContext.currentContext.CGContext, nativeGradient, start, end,
        kCGGradientDrawsBeforeStartLocation | kCGGradientDrawsAfterEndLocation);
    CGGradientRelease(nativeGradient);
  }
  CGColorSpaceRelease(space);
}

} // namespace

@implementation OneMacosViewComponentView {
  Props::Shared _props;
  EventEmitter::Shared _eventEmitter;
  LayoutMetrics _layoutMetrics;
  BOOL _clipsToBounds;
  PointerEventsMode _pointerEvents;
  BOOL _focusable;
  BOOL _accessibilityElementsHidden;
}

@synthesize reactTag = _reactTag;

- (instancetype)initWithFrame:(NSRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.wantsLayer = YES;
    self.layer.masksToBounds = NO;
    self.layerContentsRedrawPolicy = NSViewLayerContentsRedrawOnSetNeedsDisplay;
  }
  return self;
}

// react lays out from the top left
- (BOOL)isFlipped
{
  return YES;
}

- (BOOL)isOpaque
{
  return NO;
}

- (Props::Shared)props
{
  return _props;
}

- (LayoutMetrics)layoutMetrics
{
  return _layoutMetrics;
}

- (EventEmitter::Shared)eventEmitter
{
  return _eventEmitter;
}

- (void)setNeedsRender
{
  self.needsDisplay = YES;
}

// point is in the superview's coordinates. Children outside the bounds stay
// hittable unless this view clips, like a native view with overflow visible.
- (NSView *)hitTest:(NSPoint)point
{
  if (self.hidden || self.alphaValue < 0.01 || _pointerEvents == PointerEventsMode::None) {
    return nil;
  }
  NSPoint local = self.superview ? [self convertPoint:point fromView:self.superview] : point;
  BOOL inside = NSPointInRect(local, self.bounds);
  if (!inside && _clipsToBounds) {
    return nil;
  }
  if (_pointerEvents != PointerEventsMode::BoxOnly) {
    for (NSView *subview in [self.subviews reverseObjectEnumerator]) {
      NSView *hit = [subview hitTest:local];
      if (hit) {
        return hit;
      }
    }
  }
  if (_pointerEvents == PointerEventsMode::BoxNone) {
    return nil;
  }
  return inside ? self : nil;
}

#pragma mark - Focus and keyboard

// a view takes part in tab order when it handles presses, like a Pressable,
// and only while it and its ancestors are visible
- (BOOL)acceptsFirstResponder
{
  if (!_focusable) {
    return NO;
  }
  for (NSView *view = self; view; view = view.superview) {
    if (view.hidden || view.alphaValue < 0.01) {
      return NO;
    }
  }
  return YES;
}

- (BOOL)becomeFirstResponder
{
  if (![super becomeFirstResponder]) {
    return NO;
  }
  if (_eventEmitter) {
    std::static_pointer_cast<const BaseViewEventEmitter>(_eventEmitter)->onFocus();
  }
  [self noteFocusRingMaskChanged];
  return YES;
}

- (BOOL)resignFirstResponder
{
  if (![super resignFirstResponder]) {
    return NO;
  }
  if (_eventEmitter) {
    std::static_pointer_cast<const BaseViewEventEmitter>(_eventEmitter)->onBlur();
  }
  return YES;
}

- (void)keyDown:(NSEvent *)event
{
  NSString *characters = event.charactersIgnoringModifiers;
  BOOL activates = [characters isEqualToString:@" "] || [characters isEqualToString:@"\r"];
  if (_focusable && activates && !event.isARepeat) {
    [self performPress];
    return;
  }
  [super keyDown:event];
}

- (BOOL)performPress
{
  // start at this view so accessibility also works in an inactive window.
  return [self tryToPerform:@selector(oneMacosPressView:) with:self];
}

- (NSFocusRingType)focusRingType
{
  return NSFocusRingTypeExterior;
}

- (void)drawFocusRingMask
{
  [[NSBezierPath bezierPathWithRoundedRect:self.bounds xRadius:[self cornerRadius] yRadius:[self cornerRadius]] fill];
}

- (NSRect)focusRingMaskBounds
{
  return self.bounds;
}

- (CGFloat)cornerRadius
{
  if (!_props) {
    return 0;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*_props);
  const auto border = viewProps.resolveBorderMetrics(_layoutMetrics);
  return MIN((CGFloat)border.borderRadii.topLeft.horizontal, MIN(self.bounds.size.width, self.bounds.size.height) / 2);
}

#pragma mark - Accessibility

static NSAccessibilityRole AccessibilityRoleFor(const std::string &role)
{
  static NSDictionary<NSString *, NSAccessibilityRole> *roles = @{
    @"button" : NSAccessibilityButtonRole,
    @"imagebutton" : NSAccessibilityButtonRole,
    @"togglebutton" : NSAccessibilityButtonRole,
    @"link" : NSAccessibilityLinkRole,
    @"image" : NSAccessibilityImageRole,
    @"img" : NSAccessibilityImageRole,
    @"checkbox" : NSAccessibilityCheckBoxRole,
    @"switch" : NSAccessibilityCheckBoxRole,
    @"radio" : NSAccessibilityRadioButtonRole,
    @"tab" : NSAccessibilityRadioButtonRole,
    @"text" : NSAccessibilityStaticTextRole,
    @"adjustable" : NSAccessibilitySliderRole,
    @"slider" : NSAccessibilitySliderRole,
    @"progressbar" : NSAccessibilityProgressIndicatorRole,
    @"menu" : NSAccessibilityMenuRole,
    @"menuitem" : NSAccessibilityMenuItemRole,
    @"list" : NSAccessibilityListRole,
    @"combobox" : NSAccessibilityComboBoxRole,
    @"search" : NSAccessibilityTextFieldRole,
  };
  NSString *name = [NSString stringWithUTF8String:role.c_str()];
  return roles[name] ?: NSAccessibilityGroupRole;
}

- (void)applyAccessibilityProps:(const ViewProps &)viewProps
{
  BOOL elementsHidden = viewProps.accessibilityElementsHidden;
  [self setAccessibilityElement:viewProps.accessible && !elementsHidden];
  if (elementsHidden != _accessibilityElementsHidden) {
    _accessibilityElementsHidden = elementsHidden;
    NSAccessibilityPostNotification(self, NSAccessibilityLayoutChangedNotification);
  }
  NSString *label = [NSString stringWithUTF8String:viewProps.accessibilityLabel.c_str()];
  [self setAccessibilityLabel:label.length > 0 ? label : nil];
  NSString *hint = [NSString stringWithUTF8String:viewProps.accessibilityHint.c_str()];
  [self setAccessibilityHelp:hint.length > 0 ? hint : nil];
  NSString *identifier = [NSString stringWithUTF8String:viewProps.testId.c_str()];
  [self setAccessibilityIdentifier:identifier.length > 0 ? identifier : nil];

  std::string role = viewProps.role != Role::None ? toString(viewProps.role) : viewProps.accessibilityRole;
  [self setAccessibilityRole:AccessibilityRoleFor(role)];
  if (role == "switch") {
    [self setAccessibilitySubrole:NSAccessibilitySwitchSubrole];
  }

  bool disabled = viewProps.accessibilityState && viewProps.accessibilityState->disabled;
  [self setAccessibilityEnabled:!disabled];
  if (viewProps.accessibilityState) {
    const auto &state = *viewProps.accessibilityState;
    [self setAccessibilitySelected:state.selected];
    if (state.checked == AccessibilityState::Checked) {
      [self setAccessibilityValue:@YES];
    } else if (state.checked == AccessibilityState::Unchecked) {
      [self setAccessibilityValue:@NO];
    }
  }
}

// accessibilityElementsHidden removes this view's subtree from accessibility
- (NSArray *)accessibilityChildren
{
  return _accessibilityElementsHidden ? @[] : [super accessibilityChildren];
}

- (NSArray *)accessibilityChildrenInNavigationOrder
{
  return _accessibilityElementsHidden ? @[] : [super accessibilityChildrenInNavigationOrder];
}

- (BOOL)accessibilityPerformPress
{
  if (!_focusable) {
    return NO;
  }
  return [self performPress];
}

#pragma mark - OneMacosComponentView

- (NSView *)childContainerView
{
  return self;
}

- (void)mountChildComponentView:(NSView<OneMacosComponentView> *)childView index:(NSInteger)index
{
  NSView *container = [self childContainerView];
  NSArray<NSView *> *subviews = container.subviews;
  if (index <= 0 && subviews.count > 0) {
    [container addSubview:childView positioned:NSWindowBelow relativeTo:subviews.firstObject];
  } else if (index > 0 && index < (NSInteger)subviews.count) {
    [container addSubview:childView positioned:NSWindowAbove relativeTo:subviews[index - 1]];
  } else {
    [container addSubview:childView];
  }
}

- (void)unmountChildComponentView:(NSView<OneMacosComponentView> *)childView index:(NSInteger)index
{
  [childView removeFromSuperview];
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  _props = props;
  const auto &viewProps = static_cast<const ViewProps &>(*props);
  _pointerEvents = viewProps.pointerEvents;
  _focusable = viewProps.accessible && viewProps.events[ViewEvents::Offset::StartShouldSetResponder] &&
      !(viewProps.accessibilityState && viewProps.accessibilityState->disabled);
  [self applyAccessibilityProps:viewProps];
  _clipsToBounds = viewProps.getClipsContentToBounds();
  self.alphaValue = (CGFloat)viewProps.opacity;
  // focus cannot stay inside a view that just became invisible
  NSResponder *responder = self.window.firstResponder;
  if (self.alphaValue < 0.01 && [responder isKindOfClass:NSView.class] && [(NSView *)responder isDescendantOf:self]) {
    [self.window makeFirstResponder:nil];
  }
  [self applyTransform];
  [self applyClip];
  [self setNeedsRender];
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter
{
  _eventEmitter = eventEmitter;
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  _layoutMetrics = layoutMetrics;
  self.hidden = layoutMetrics.displayType == DisplayType::None;
  self.frame = NSMakeRect(
      layoutMetrics.frame.origin.x,
      layoutMetrics.frame.origin.y,
      layoutMetrics.frame.size.width,
      layoutMetrics.frame.size.height);
  [self applyTransform];
  [self applyClip];
  [self setNeedsRender];
}

// children clip to the same rounded outline the view paints
- (void)applyClip
{
  self.layer.masksToBounds = _clipsToBounds;
  self.layer.cornerRadius = _clipsToBounds ? [self cornerRadius] : 0;
}

- (void)applyTransform
{
  if (!_props) {
    return;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*_props);
  const auto &m = viewProps.resolveTransform(_layoutMetrics).matrix;
  // appkit places layer anchors at the top left; rn transforms use the center.
  CGFloat x = self.bounds.size.width / 2;
  CGFloat y = self.bounds.size.height / 2;
  CATransform3D transform = CATransform3D{
      m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7],
      m[8], m[9], m[10], m[11], m[12], m[13], m[14], m[15]};
  self.layer.transform = CATransform3DConcat(
      CATransform3DConcat(CATransform3DMakeTranslation(-x, -y, 0), transform),
      CATransform3DMakeTranslation(x, y, 0));
}

- (void)finalizeUpdates:(OneMacosUpdateMask)updateMask
{
}

#pragma mark - Painting

// colors resolved while drawing follow the appearance, so a change repaints
- (void)viewDidChangeEffectiveAppearance
{
  [super viewDidChangeEffectiveAppearance];
  [self setNeedsDisplay:YES];
}

- (void)drawRect:(NSRect)dirtyRect
{
  if (!_props) {
    return;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*_props);
  const auto border = viewProps.resolveBorderMetrics(_layoutMetrics);
  CGRect bounds = self.bounds;
  CGFloat radius = MIN((CGFloat)border.borderRadii.topLeft.horizontal, MIN(bounds.size.width, bounds.size.height) / 2);
  CGFloat borderWidth = (CGFloat)border.borderWidths.top;

  NSBezierPath *outline = [NSBezierPath bezierPathWithRoundedRect:bounds xRadius:radius yRadius:radius];
  if (viewProps.backgroundColor) {
    [OneMacosColorFromSharedColor(viewProps.backgroundColor) setFill];
    [outline fill];
  }
  if (!viewProps.backgroundImage.empty()) {
    [NSGraphicsContext saveGraphicsState];
    [outline addClip];
    // the first background image is nearest the viewer, above the solid fill.
    for (auto image = viewProps.backgroundImage.rbegin(); image != viewProps.backgroundImage.rend(); ++image) {
      if (auto gradient = std::get_if<LinearGradient>(&*image)) {
        DrawLinearGradient(*gradient, bounds);
      }
    }
    [NSGraphicsContext restoreGraphicsState];
  }
  SharedColor borderColor = border.borderColors.top;
  if (borderWidth > 0 && borderColor) {
    CGRect inset = CGRectInset(bounds, borderWidth / 2, borderWidth / 2);
    NSBezierPath *stroke = [NSBezierPath bezierPathWithRoundedRect:inset
                                                           xRadius:MAX(radius - borderWidth / 2, 0)
                                                           yRadius:MAX(radius - borderWidth / 2, 0)];
    stroke.lineWidth = borderWidth;
    [OneMacosColorFromSharedColor(borderColor) setStroke];
    [stroke stroke];
  }
}

@end
