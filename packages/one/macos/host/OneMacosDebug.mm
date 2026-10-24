#import "OneMacosDebug.h"

#include <signal.h>
#include <folly/json.h>

#include <react/renderer/components/view/AccessibilityProps.h>
#include <react/renderer/components/view/ViewProps.h>

#import "OneMacosComponentView.h"

// DEBUG builds only. With ONE_MACOS_DEBUG_DIR set, the app drives itself for
// screenshots and interaction proofs:
//   SIGUSR1  writes snapshot-N.png
//   SIGUSR2  runs the ops in $DIR/command.json, a list like
//            [{"op": "click", "testId": "press-me", "wait": 0.3}, {"op": "snapshot", "name": "hover"}]
// ops: snapshot, click, move, drag, scroll (deltaX/deltaY), key, type, tab, appearance, resize,
// inspect, press, accessibilityPress, command, log. Points are `x`/`y` in the root view's top left space, or `testId` for the
// center of a view.

using namespace facebook::react;

static NSView *OneMacosFindTestId(NSView *view, NSString *testId)
{
  if ([view isKindOfClass:OneMacosViewComponentView.class]) {
    auto props = ((OneMacosViewComponentView *)view).props;
    if (props && static_cast<const ViewProps &>(*props).testId == testId.UTF8String) {
      return view;
    }
  }
  for (NSView *child in view.subviews) {
    if (NSView *found = OneMacosFindTestId(child, testId)) {
      return found;
    }
  }
  return nil;
}

static NSString *OneMacosTestIdOf(NSResponder *responder)
{
  while (responder) {
    if ([responder isKindOfClass:OneMacosViewComponentView.class]) {
      auto props = ((OneMacosViewComponentView *)responder).props;
      if (props && !static_cast<const ViewProps &>(*props).testId.empty()) {
        return [NSString stringWithUTF8String:static_cast<const ViewProps &>(*props).testId.c_str()];
      }
    }
    responder = responder.nextResponder;
  }
  return @"";
}

static void OneMacosWriteSnapshot(NSView *rootView, NSString *dir, NSString *name)
{
  NSView *content = rootView.window.contentView;
  NSBitmapImageRep *rep = [content bitmapImageRepForCachingDisplayInRect:content.bounds];
  [content cacheDisplayInRect:content.bounds toBitmapImageRep:rep];
  static int count = 0;
  NSString *label = name ?: [NSString stringWithFormat:@"%d", ++count];
  NSString *path = [dir stringByAppendingFormat:@"/snapshot-%@.png", label];
  [[rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}] writeToFile:path atomically:YES];
  NSLog(@"[one-macos] snapshot %@", path);
}

// op point -> root view space
static BOOL OneMacosPoint(NSView *root, NSDictionary *op, NSString *xKey, NSString *yKey, NSPoint *out)
{
  NSString *testId = op[@"testId"];
  if (testId && [xKey isEqualToString:@"x"]) {
    NSView *view = OneMacosFindTestId(root, testId);
    if (!view) {
      NSLog(@"[one-macos] no view with testId %@", testId);
      return NO;
    }
    NSPoint center = [root convertPoint:NSMakePoint(NSMidX(view.bounds), NSMidY(view.bounds)) fromView:view];
    *out = NSMakePoint(center.x + [op[@"dx"] doubleValue], center.y + [op[@"dy"] doubleValue]);
    return YES;
  }
  if (!op[xKey] || !op[yKey]) {
    return NO;
  }
  *out = NSMakePoint([op[xKey] doubleValue], [op[yKey] doubleValue]);
  return YES;
}

static NSEvent *OneMacosMouseEvent(NSView *root, NSEventType type, NSPoint rootPoint)
{
  NSWindow *window = root.window;
  return [NSEvent mouseEventWithType:type
                            location:[root convertPoint:rootPoint toView:nil]
                       modifierFlags:0
                           timestamp:NSProcessInfo.processInfo.systemUptime
                        windowNumber:window.windowNumber
                             context:nil
                         eventNumber:0
                          clickCount:1
                            pressure:type == NSEventTypeLeftMouseUp ? 0 : 1];
}

static void OneMacosSendKey(NSView *root, NSString *characters, unsigned short keyCode, NSEventModifierFlags flags)
{
  NSWindow *window = root.window;
  for (NSNumber *type in @[ @(NSEventTypeKeyDown), @(NSEventTypeKeyUp) ]) {
    NSEvent *event = [NSEvent keyEventWithType:(NSEventType)type.integerValue
                                      location:NSZeroPoint
                                 modifierFlags:flags
                                     timestamp:NSProcessInfo.processInfo.systemUptime
                                  windowNumber:window.windowNumber
                                       context:nil
                                    characters:characters
                   charactersIgnoringModifiers:characters
                                     isARepeat:NO
                                       keyCode:keyCode];
    [window sendEvent:event];
  }
}

static NSString *OneMacosCursorName(void)
{
  NSCursor *current = NSCursor.currentCursor;
  NSDictionary<NSString *, NSCursor *> *cursors = @{
    @"arrow" : NSCursor.arrowCursor,
    @"pointingHand" : NSCursor.pointingHandCursor,
    @"iBeam" : NSCursor.IBeamCursor,
    @"crosshair" : NSCursor.crosshairCursor,
    @"openHand" : NSCursor.openHandCursor,
    @"notAllowed" : NSCursor.operationNotAllowedCursor,
  };
  for (NSString *name in cursors) {
    if ([cursors[name].image isEqual:current.image] && NSEqualPoints(cursors[name].hotSpot, current.hotSpot)) {
      return name;
    }
  }
  return @"other";
}

static void OneMacosInspectSubviews(NSView *view, NSMutableArray *values)
{
  if ([view isKindOfClass:NSTextField.class]) {
    [values addObject:@{ @"class": NSStringFromClass(view.class), @"text": ((NSTextField *)view).stringValue }];
  } else if ([view isKindOfClass:NSTextView.class]) {
    [values addObject:@{ @"class": NSStringFromClass(view.class), @"text": ((NSTextView *)view).string }];
  } else if ([view isKindOfClass:NSScrollView.class]) {
    NSScrollView *scroll = (NSScrollView *)view;
    [values addObject:@{ @"class": NSStringFromClass(view.class), @"offset": NSStringFromPoint(scroll.contentView.bounds.origin),
                        @"contentSize": NSStringFromSize(scroll.documentView.frame.size) }];
  }
  for (NSView *child in view.subviews) {
    OneMacosInspectSubviews(child, values);
  }
}

static void OneMacosRunOp(NSView *root, NSString *dir, NSDictionary *op)
{
  NSWindow *window = root.window;
  NSString *name = op[@"op"];
  NSPoint point;
  if ([name isEqualToString:@"snapshot"]) {
    OneMacosWriteSnapshot(root, dir, op[@"name"]);
  } else if ([name isEqualToString:@"inspect"]) {
    NSView *view = OneMacosFindTestId(root, op[@"testId"]);
    if (!view) {
      NSLog(@"[one-macos] inspect missing %@", op[@"testId"]);
      return;
    }
    CATransform3D transform = view.layer.transform;
    NSMutableDictionary *state = [@{
      @"testId": op[@"testId"],
      @"alpha": @(view.alphaValue),
      @"translateX": @(transform.m41),
      @"translateY": @(transform.m42),
      @"frame": NSStringFromRect(view.frame),
      @"frontmostPid": @(NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier),
    } mutableCopy];
    if ([view isKindOfClass:OneMacosViewComponentView.class]) {
      auto props = ((OneMacosViewComponentView *)view).props;
      if (props) {
        state[@"propOpacity"] = @(static_cast<const ViewProps &>(*props).opacity);
      }
    }
    NSMutableArray *values = [NSMutableArray new];
    OneMacosInspectSubviews(view, values);
    state[@"nativeSubviews"] = values;
    NSData *data = [NSJSONSerialization dataWithJSONObject:state options:NSJSONWritingPrettyPrinted error:nil];
    [data writeToFile:[dir stringByAppendingFormat:@"/inspect-%@.json", op[@"name"] ?: op[@"testId"]] atomically:YES];
  } else if ([name isEqualToString:@"command"]) {
    id<OneMacosComponentView> view = (id)OneMacosFindTestId(root, op[@"testId"]);
    if ([view respondsToSelector:@selector(handleCommand:args:)]) {
      NSData *args = [NSJSONSerialization dataWithJSONObject:op[@"args"] ?: @[] options:0 error:nil];
      std::string json((const char *)args.bytes, args.length);
      [view handleCommand:std::string([op[@"name"] UTF8String]) args:folly::parseJson(json)];
    }
  } else if ([name isEqualToString:@"accessibilityPress"]) {
    NSView *view = OneMacosFindTestId(root, op[@"testId"]);
    BOOL accepted = [view accessibilityPerformPress];
    NSDictionary *result = @{ @"accepted": @(accepted), @"focusable": @(view.acceptsFirstResponder),
                              @"appActive": @(NSApp.active), @"windowKey": @(window.keyWindow) };
    NSData *data = [NSJSONSerialization dataWithJSONObject:result options:NSJSONWritingPrettyPrinted error:nil];
    [data writeToFile:[dir stringByAppendingFormat:@"/axPress-%@.json", op[@"name"] ?: op[@"testId"]] atomically:YES];
  } else if ([name isEqualToString:@"press"]) {
    [(id<OneMacosPressTarget>)root oneMacosPressView:OneMacosFindTestId(root, op[@"testId"])];
  } else if ([name isEqualToString:@"click"]) {
    if (OneMacosPoint(root, op, @"x", @"y", &point)) {
      NSEvent *down = OneMacosMouseEvent(root, NSEventTypeLeftMouseDown, point);
      NSEvent *up = OneMacosMouseEvent(root, NSEventTypeLeftMouseUp, point);
      [window sendEvent:down];
      [window sendEvent:up];
      NSLog(@"[one-macos] clicked %@ at %@", op[@"testId"] ?: @"", NSStringFromPoint(point));
    }
  } else if ([name isEqualToString:@"move"]) {
    // tracking areas need real hardware events, so hand the move to the root directly
    if (OneMacosPoint(root, op, @"x", @"y", &point)) {
      [root mouseMoved:OneMacosMouseEvent(root, NSEventTypeMouseMoved, point)];
      NSLog(@"[one-macos] moved to %@", NSStringFromPoint(point));
    }
  } else if ([name isEqualToString:@"drag"]) {
    NSPoint from, to;
    if (OneMacosPoint(root, op, @"x", @"y", &from) && op[@"toX"] && op[@"toY"]) {
      to = NSMakePoint([op[@"toX"] doubleValue], [op[@"toY"] doubleValue]);
      [window sendEvent:OneMacosMouseEvent(root, NSEventTypeLeftMouseDown, from)];
      int steps = 8;
      for (int step = 1; step <= steps; step++) {
        NSPoint p = NSMakePoint(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps);
        [window sendEvent:OneMacosMouseEvent(root, NSEventTypeLeftMouseDragged, p)];
      }
      [window sendEvent:OneMacosMouseEvent(root, NSEventTypeLeftMouseUp, to)];
    }
  } else if ([name isEqualToString:@"scroll"]) {
    if (OneMacosPoint(root, op, @"x", @"y", &point)) {
      CGEventRef cg = CGEventCreateScrollWheelEvent2(
          NULL, kCGScrollEventUnitPixel, 2, (int32_t)[op[@"deltaY"] doubleValue], (int32_t)[op[@"deltaX"] doubleValue], 0);
      NSEvent *event = [NSEvent eventWithCGEvent:cg];
      CFRelease(cg);
      NSPoint inWindow = [root convertPoint:point toView:nil];
      // the factory events carry no window, so deliver to the view under the point
      NSView *hit = [window.contentView.superview hitTest:inWindow];
      NSLog(@"[one-macos] scroll %@ over %@", op[@"deltaY"], hit.class);
      [hit scrollWheel:event];
    }
  } else if ([name isEqualToString:@"key"]) {
    NSDictionary<NSString *, NSArray *> *keys = @{
      @"space" : @[ @" ", @49 ],
      @"return" : @[ @"\r", @36 ],
      @"tab" : @[ @"\t", @48 ],
      @"escape" : @[ @"\e", @53 ],
      @"delete" : @[ @"\x7f", @51 ],
    };
    NSArray *entry = keys[op[@"key"]];
    NSEventModifierFlags flags = [op[@"shift"] boolValue] ? NSEventModifierFlagShift : 0;
    if (entry) {
      OneMacosSendKey(root, entry[0], (unsigned short)[entry[1] intValue], flags);
    } else {
      OneMacosSendKey(root, op[@"key"], 0, flags);
    }
    NSLog(@"[one-macos] key %@", op[@"key"]);
  } else if ([name isEqualToString:@"type"]) {
    NSString *text = op[@"text"];
    for (NSUInteger i = 0; i < text.length; i++) {
      OneMacosSendKey(root, [text substringWithRange:NSMakeRange(i, 1)], 0, 0);
    }
  } else if ([name isEqualToString:@"appearance"]) {
    NSString *mode = op[@"mode"];
    NSApp.appearance = [mode isEqualToString:@"system"]
        ? nil
        : [NSAppearance appearanceNamed:[mode isEqualToString:@"dark"] ? NSAppearanceNameDarkAqua : NSAppearanceNameAqua];
    NSLog(@"[one-macos] appearance %@", mode);
  } else if ([name isEqualToString:@"resize"]) {
    [window setContentSize:NSMakeSize([op[@"width"] doubleValue], [op[@"height"] doubleValue])];
    NSLog(@"[one-macos] resized to %@", NSStringFromSize(window.contentView.bounds.size));
  } else if ([name isEqualToString:@"log"]) {
    NSLog(@"[one-macos] state firstResponder=%@ testId=%@ cursor=%@",
          window.firstResponder.class,
          OneMacosTestIdOf(window.firstResponder),
          OneMacosCursorName());
  }
}

static void OneMacosRunCommands(NSView *root, NSString *dir)
{
  NSData *data = [NSData dataWithContentsOfFile:[dir stringByAppendingPathComponent:@"command.json"]];
  NSArray<NSDictionary *> *ops = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  if (![ops isKindOfClass:NSArray.class]) {
    NSLog(@"[one-macos] no commands in %@/command.json", dir);
    return;
  }

  __block NSUInteger index = 0;
  __weak NSView *weakRoot = root;
  __block void (^step)(void);
  step = ^{
    NSView *strongRoot = weakRoot;
    if (!strongRoot || index >= ops.count) {
      step = nil;
      return;
    }
    NSDictionary *op = ops[index++];
    OneMacosRunOp(strongRoot, dir, op);
    double wait = op[@"wait"] ? [op[@"wait"] doubleValue] : 0.3;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(wait * NSEC_PER_SEC)), dispatch_get_main_queue(), step);
  };
  step();
}

static dispatch_source_t OneMacosSignalSource(int sig, dispatch_block_t handler)
{
  signal(sig, SIG_IGN);
  dispatch_source_t source = dispatch_source_create(DISPATCH_SOURCE_TYPE_SIGNAL, sig, 0, dispatch_get_main_queue());
  dispatch_source_set_event_handler(source, handler);
  dispatch_resume(source);
  return source;
}

void OneMacosInstallDebugHooks(NSView *rootView)
{
#if DEBUG
  NSString *dir = NSProcessInfo.processInfo.environment[@"ONE_MACOS_DEBUG_DIR"];
  if (dir.length == 0) {
    return;
  }
  static NSArray *sources;
  __weak NSView *weakView = rootView;
  sources = @[
    OneMacosSignalSource(SIGUSR1, ^{
      if (weakView) {
        OneMacosWriteSnapshot(weakView, dir, nil);
      }
    }),
    OneMacosSignalSource(SIGUSR2, ^{
      if (weakView) {
        OneMacosRunCommands(weakView, dir);
      }
    }),
  ];
#endif
}
