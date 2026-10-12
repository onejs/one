#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

// the prebuilt app delegate calls this from customizeRootView through the
// app's bridging header. it keeps the app's launch storyboard as the react
// native root view's loading view until the first content appears, so the
// launch screen never gives way to an empty root.
FOUNDATION_EXPORT void OneHoldLaunchScreen(UIView *rootView);

// One.LaunchScreen: keep the held launch screen past the first content, and
// release it, optionally fading it out.
FOUNDATION_EXPORT void OneLaunchScreenPreventAutoHide(void);
FOUNDATION_EXPORT void OneLaunchScreenHide(BOOL fade);

NS_ASSUME_NONNULL_END
