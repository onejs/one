#import "OneLaunchScreen.h"
#import <React/RCTRootView.h>
#import <React/RCTSurfaceHostingProxyRootView.h>

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
                [launchView removeFromSuperview];
              }];
}
