#import "OneMacosDebug.h"

#include <signal.h>

static NSView *OneMacosFindView(NSView *view, NSString *className)
{
  if ([NSStringFromClass(view.class) isEqualToString:className]) {
    return view;
  }
  for (NSView *child in view.subviews) {
    if (NSView *found = OneMacosFindView(child, className)) {
      return found;
    }
  }
  return nil;
}

static void OneMacosWriteSnapshot(NSView *rootView, NSString *dir)
{
  NSView *content = rootView.window.contentView;
  NSBitmapImageRep *rep = [content bitmapImageRepForCachingDisplayInRect:content.bounds];
  [content cacheDisplayInRect:content.bounds toBitmapImageRep:rep];
  static int count = 0;
  NSString *path = [dir stringByAppendingFormat:@"/snapshot-%d.png", ++count];
  [[rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}] writeToFile:path atomically:YES];
  NSLog(@"[one-macos] snapshot %@", path);
}

static void OneMacosClickToggle(NSView *rootView)
{
  NSView *toggle = OneMacosFindView(rootView, @"OneMacToggleHostView");
  NSWindow *window = rootView.window;
  if (!toggle || !window) {
    NSLog(@"[one-macos] no toggle to click");
    return;
  }
  // the switch track sits at the trailing edge of the row
  NSPoint point = [toggle convertPoint:NSMakePoint(toggle.bounds.size.width - 24, toggle.bounds.size.height / 2) toView:nil];
  for (NSNumber *type in @[ @(NSEventTypeLeftMouseDown), @(NSEventTypeLeftMouseUp) ]) {
    NSEvent *event = [NSEvent mouseEventWithType:(NSEventType)type.integerValue
                                        location:point
                                   modifierFlags:0
                                       timestamp:NSProcessInfo.processInfo.systemUptime
                                    windowNumber:window.windowNumber
                                         context:nil
                                     eventNumber:0
                                      clickCount:1
                                        pressure:1];
    [window sendEvent:event];
  }
  NSLog(@"[one-macos] clicked toggle at %@", NSStringFromPoint(point));
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
        OneMacosWriteSnapshot(weakView, dir);
      }
    }),
    OneMacosSignalSource(SIGUSR2, ^{
      if (weakView) {
        OneMacosClickToggle(weakView);
      }
    }),
  ];
#endif
}
