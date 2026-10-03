#import "OneLaunchScreen.h"
#import <React/RCTRootView.h>
#import <React/RCTSurfaceHostingProxyRootView.h>
#import <stdatomic.h>

// set from the js thread while the app's modules evaluate, read on main when
// the first content appears.
static atomic_bool preventAutoHide = false;
// the launch view still over the root; main thread only.
static UIView *heldLaunchView;

static void releaseLaunchView(BOOL fade) {
  UIView *launchView = heldLaunchView;
  heldLaunchView = nil;
  if (launchView == nil) return;
  if (!fade) {
    [launchView removeFromSuperview];
    return;
  }
  [UIView animateWithDuration:0.25
      animations:^{
        launchView.alpha = 0;
      }
      completion:^(BOOL finished) {
        [launchView removeFromSuperview];
      }];
}

void OneHoldLaunchScreen(UIView *rootView) {
  // the new architecture's factory always hands customizeRootView this class.
  NSCAssert([rootView isKindOfClass:[RCTSurfaceHostingProxyRootView class]],
            @"OneHoldLaunchScreen expects the react native root view, got %@", rootView.class);
  RCTSurfaceHostingProxyRootView *hostView = (RCTSurfaceHostingProxyRootView *)rootView;
  // the storyboard the system showed at launch, named by the app's plist.
  NSString *storyboardName = [NSBundle.mainBundle objectForInfoDictionaryKey:@"UILaunchStoryboardName"];
  NSCAssert(storyboardName != nil, @"OneHoldLaunchScreen needs UILaunchStoryboardName in Info.plist");
  UIView *launchView =
      [[UIStoryboard storyboardWithName:storyboardName bundle:NSBundle.mainBundle] instantiateInitialViewController]
          .view;
  heldLaunchView = launchView;
  // a fabric surface reports running as soon as it starts, before js draws
  // anything, so the loading view's auto hide would drop it at once. it stays
  // until the root component view posts its first content instead.
  [hostView disableActivityIndicatorAutoHide:YES];
  hostView.loadingView = launchView;
  __block id observer = [NSNotificationCenter.defaultCenter
      addObserverForName:RCTContentDidAppearNotification
                  object:nil
                   queue:NSOperationQueue.mainQueue
              usingBlock:^(NSNotification *notification) {
                [NSNotificationCenter.defaultCenter removeObserver:observer];
                if (!atomic_load(&preventAutoHide)) releaseLaunchView(NO);
              }];
}

void OneLaunchScreenPreventAutoHide(void) {
  atomic_store(&preventAutoHide, true);
}

void OneLaunchScreenHide(BOOL fade) {
  dispatch_async(dispatch_get_main_queue(), ^{
    releaseLaunchView(fade);
  });
}
