#import <Foundation/Foundation.h>

// the public bridge uses foundation types so importing one does not pull react
// into the clang module before nitrogen's c++ headers are imported.
FOUNDATION_EXPORT void OneNativeSourceSendEvent(NSString *channel, NSString *argsJson);
