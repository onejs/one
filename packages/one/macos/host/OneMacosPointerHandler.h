#pragma once

#import <AppKit/AppKit.h>

NS_ASSUME_NONNULL_BEGIN

// Turns mouse input on the surface into React touch and pointer events, the
// AppKit counterpart of RCTSurfaceTouchHandler. The root view forwards the
// mouse calls AppKit delivers up the responder chain when no native control
// (a scroll view, a text view, a hosted SwiftUI control) consumed them.
@interface OneMacosPointerHandler : NSObject

- (instancetype)initWithRootView:(NSView *)rootView;

- (void)mouseDown:(NSEvent *)event;
- (void)mouseDragged:(NSEvent *)event;
- (void)mouseUp:(NSEvent *)event;
- (void)mouseMoved:(NSEvent *)event;
- (void)mouseExited:(NSEvent *)event;

// A keyboard activation (space or return on a focused view): the same touch
// sequence a click at the view's center would send, so Pressability fires onPress.
- (void)pressView:(NSView *)view;

@end

NS_ASSUME_NONNULL_END
