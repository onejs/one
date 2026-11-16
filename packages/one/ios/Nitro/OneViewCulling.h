#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

// ios.viewCulling: the prebuilt app delegate calls this right after it creates
// the react native factory, before react native starts. it turns on react
// native's view culling, which leaves views outside a scroll view's visible
// area unmounted instead of mounting them and clipping them on every update.
FOUNDATION_EXPORT void OneEnableViewCulling(void);

NS_ASSUME_NONNULL_END
