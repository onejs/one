#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

// release entry point the prebuild patch calls from AppDelegate through the
// app's bridging header. answers the bundle url the host boots from, after
// selecting the newest ready update; without an updates url it is the
// embedded bundle.
FOUNDATION_EXPORT NSURL *_Nullable OneUpdatesBundleURL(void);

NS_ASSUME_NONNULL_END
