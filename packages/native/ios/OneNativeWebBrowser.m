#import "OneNativeWebBrowser.h"

#import <React/RCTUtils.h>

@import AuthenticationServices;
@import SafariServices;

// in-app browser matching expo-web-browser's result shapes: plain pages in
// SFSafariViewController, auth in ASWebAuthenticationSession.
@interface OneNativeWebBrowser () <SFSafariViewControllerDelegate,
                                   ASWebAuthenticationPresentationContextProviding>
@end

@implementation OneNativeWebBrowser {
  SFSafariViewController *_safari;
  RCTPromiseResolveBlock _browserResolve;
  ASWebAuthenticationSession *_authSession;
}

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (UIViewController *)presentingViewController
{
  UIViewController *root = RCTKeyWindow().rootViewController;
  while (root.presentedViewController) {
    root = root.presentedViewController;
  }
  return root;
}

+ (UIModalPresentationStyle)presentationStyleForName:(id)value
{
  if (![value isKindOfClass:[NSString class]]) {
    return UIModalPresentationOverFullScreen;
  }
  NSString *name = (NSString *)value;
  if ([name isEqualToString:@"automatic"]) {
    return UIModalPresentationAutomatic;
  }
  if ([name isEqualToString:@"currentContext"]) {
    return UIModalPresentationCurrentContext;
  }
  if ([name isEqualToString:@"formSheet"]) {
    return UIModalPresentationFormSheet;
  }
  if ([name isEqualToString:@"fullScreen"]) {
    return UIModalPresentationFullScreen;
  }
  if ([name isEqualToString:@"overCurrentContext"]) {
    return UIModalPresentationOverCurrentContext;
  }
  if ([name isEqualToString:@"pageSheet"]) {
    return UIModalPresentationPageSheet;
  }
  if ([name isEqualToString:@"popover"]) {
    return UIModalPresentationPopover;
  }
  return UIModalPresentationOverFullScreen;
}

+ (UIColor *)colorForHex:(id)value
{
  if (![value isKindOfClass:[NSString class]]) {
    return nil;
  }
  NSString *hex = [(NSString *)value
      stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
  if ([hex hasPrefix:@"#"]) {
    hex = [hex substringFromIndex:1];
  }
  if (hex.length != 6 && hex.length != 8) {
    return nil;
  }
  unsigned int rgba = 0;
  if (![[NSScanner scannerWithString:hex] scanHexInt:&rgba]) {
    return nil;
  }
  CGFloat red, green, blue, alpha = 1;
  if (hex.length == 6) {
    red = ((rgba >> 16) & 0xff) / 255.0;
    green = ((rgba >> 8) & 0xff) / 255.0;
    blue = (rgba & 0xff) / 255.0;
  } else {
    red = ((rgba >> 24) & 0xff) / 255.0;
    green = ((rgba >> 16) & 0xff) / 255.0;
    blue = ((rgba >> 8) & 0xff) / 255.0;
    alpha = (rgba & 0xff) / 255.0;
  }
  return [UIColor colorWithRed:red green:green blue:blue alpha:alpha];
}

RCT_EXPORT_METHOD(openBrowser:(NSString *)urlString
                  options:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString ?: @""];
  if (url == nil || url.scheme == nil) {
    reject(@"ERR_WEB_BROWSER_URL", @"openBrowser requires a url.", nil);
    return;
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    if (_safari != nil) {
      resolve(@{@"type" : @"locked"});
      return;
    }
    SFSafariViewController *safari =
        [[SFSafariViewController alloc] initWithURL:url
                                     configuration:[[SFSafariViewControllerConfiguration alloc] init]];
    safari.delegate = self;
    UIColor *barTint = [OneNativeWebBrowser colorForHex:options[@"toolbarColor"]];
    if (barTint != nil) {
      safari.preferredBarTintColor = barTint;
    }
    UIColor *controlTint = [OneNativeWebBrowser colorForHex:options[@"controlsColor"]];
    if (controlTint != nil) {
      safari.preferredControlTintColor = controlTint;
    }
    safari.modalPresentationStyle =
        [OneNativeWebBrowser presentationStyleForName:options[@"presentationStyle"]];
    _safari = safari;
    _browserResolve = resolve;
    [[self presentingViewController] presentViewController:safari animated:YES completion:nil];
  });
}

RCT_EXPORT_METHOD(dismissBrowser:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    SFSafariViewController *safari = _safari;
    RCTPromiseResolveBlock browserResolve = _browserResolve;
    _safari = nil;
    _browserResolve = nil;
    if (safari != nil) {
      // programmatic dismissal skips the delegate, so the pending
      // openBrowser promise resolves here.
      [[self presentingViewController] dismissViewControllerAnimated:YES completion:nil];
      if (browserResolve != nil) {
        browserResolve(@{@"type" : @"dismiss"});
      }
    }
    resolve(@{@"type" : @"dismiss"});
  });
}

RCT_EXPORT_METHOD(openAuthSession:(NSString *)urlString
                  redirectUrl:(id)redirectUrl
                  options:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString ?: @""];
  if (url == nil || url.scheme == nil) {
    reject(@"ERR_WEB_BROWSER_URL", @"openAuthSession requires a url.", nil);
    return;
  }
  NSString *scheme = nil;
  if ([redirectUrl isKindOfClass:[NSString class]] && [(NSString *)redirectUrl length] > 0) {
    scheme = [NSURL URLWithString:(NSString *)redirectUrl].scheme;
  }
  dispatch_async(dispatch_get_main_queue(), ^{
    if (_authSession != nil) {
      resolve(@{@"type" : @"locked"});
      return;
    }
    ASWebAuthenticationSession *session = [[ASWebAuthenticationSession alloc]
        initWithURL:url
        callbackURLScheme:scheme
        completionHandler:^(NSURL *_Nullable callbackURL, NSError *_Nullable error) {
          _authSession = nil;
          if (callbackURL != nil) {
            resolve(@{@"type" : @"success", @"url" : callbackURL.absoluteString});
          } else {
            resolve(@{@"type" : @"cancel"});
          }
        }];
    if ([options[@"preferEphemeralSession"] isEqual:@YES]) {
      session.prefersEphemeralWebBrowserSession = YES;
    }
    session.presentationContextProvider = self;
    _authSession = session;
    if (![session start]) {
      _authSession = nil;
      reject(@"ERR_WEB_BROWSER_START", @"The auth session could not start.", nil);
    }
  });
}

#pragma mark - SFSafariViewControllerDelegate

- (void)safariViewControllerDidFinish:(SFSafariViewController *)controller
{
  if (_safari != controller) {
    return;
  }
  _safari = nil;
  RCTPromiseResolveBlock resolve = _browserResolve;
  _browserResolve = nil;
  if (resolve != nil) {
    resolve(@{@"type" : @"cancel"});
  }
}

#pragma mark - ASWebAuthenticationPresentationContextProviding

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:
    (ASWebAuthenticationSession *)session
{
  return RCTKeyWindow();
}

@end
