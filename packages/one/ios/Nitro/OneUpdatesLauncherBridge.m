#import "OneUpdatesLauncherBridge.h"
#import <React/RCTAssert.h>
#import <dispatch/dispatch.h>
#import "One-Swift.h"

#if !DEBUG
static RCTFatalHandler sPreviousFatalHandler = nil;
static RCTFatalExceptionHandler sPreviousFatalExceptionHandler = nil;

static void OneUpdatesInstallFatalHandlersIfNeeded(void) {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    if (![OneUpdatesLauncher isEnabled]) {
      return;
    }
    sPreviousFatalHandler = RCTGetFatalHandler();
    sPreviousFatalExceptionHandler = RCTGetFatalExceptionHandler();

    RCTSetFatalHandler(^(NSError *error) {
      if (!error) {
        return;
      }
      id rawStack = error.userInfo[RCTJSStackTraceKey];
      NSArray<NSDictionary<NSString *, id> *> *stack =
          [rawStack isKindOfClass:[NSArray class]] ? rawStack : nil;
      NSString *untruncated = RCTFormatError(error.localizedDescription, stack, 0);
      if ([OneUpdatesLauncher rollBackIfArmedWithReason:untruncated ?: error.localizedDescription]) {
        return;
      }
      NSLog(@"[OneUpdates] Fatal error after launch: %@", untruncated);
      if (sPreviousFatalHandler) {
        sPreviousFatalHandler(error);
        return;
      }
      NSString *name =
          [NSString stringWithFormat:@"%@: %@", RCTFatalExceptionName, error.localizedDescription];
      NSString *message = RCTFormatError(error.localizedDescription, stack, 175);
      NSMutableDictionary *userInfo =
          error.userInfo ? [error.userInfo mutableCopy] : [NSMutableDictionary dictionary];
      if (untruncated) {
        userInfo[@"RCTUntruncatedMessageKey"] = untruncated;
      }
      @throw [[NSException alloc] initWithName:name reason:message userInfo:userInfo];
    });

    RCTSetFatalExceptionHandler(^(NSException *exception) {
      if (!exception) {
        return;
      }
      NSString *reason = exception.reason ?: exception.name;
      if ([OneUpdatesLauncher rollBackIfArmedWithReason:reason]) {
        return;
      }
      NSLog(@"[OneUpdates] Fatal exception after launch: %@: %@", exception.name, exception.reason);
      if (sPreviousFatalExceptionHandler) {
        sPreviousFatalExceptionHandler(exception);
        return;
      }
      @throw exception;
    });
  });
}
#endif

NSURL *_Nullable OneUpdatesBundleURL(void) {
#if !DEBUG
  OneUpdatesInstallFatalHandlersIfNeeded();
#endif
  return [OneUpdatesLauncher bundleURL];
}
