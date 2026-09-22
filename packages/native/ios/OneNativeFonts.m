#import "OneNativeFonts.h"

#import <CommonCrypto/CommonDigest.h>
#import <CoreText/CoreText.h>
#import <React/RCTConvert.h>
#import <UIKit/UIKit.h>

// runtime font loading for One.UI.Fonts. one path: make the uri a local
// file, register it for the process, then check the name. only the observed
// schemes ship: file:// is used as is, http(s):// is downloaded to
// Caches/one-fonts/<sha256 of url>.<ext>. a legacy module, like the
// package's other native modules; TurboModuleRegistry.get falls back to it.
@implementation OneNativeFonts

RCT_EXPORT_MODULE(OneNativeFonts)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (BOOL)fontIsLoaded:(NSString *)name
{
  if ([UIFont fontWithName:name size:12.0] != nil) {
    return YES;
  }
  return [UIFont fontNamesForFamilyName:name].count > 0;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isLoaded:(NSString *)name)
{
  return @([self fontIsLoaded:name]);
}

- (NSString *)sha256HexOfString:(NSString *)string
{
  NSData *data = [string dataUsingEncoding:NSUTF8StringEncoding];
  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
  NSMutableString *hex = [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
  for (int i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
    [hex appendFormat:@"%02x", digest[i]];
  }
  return hex;
}

- (NSURL *)cachedFileURLForFontURL:(NSURL *)url
                    name:(NSString *)name
                   error:(NSError **)error
{
  NSString *extension = url.pathExtension.length > 0 ? url.pathExtension : @"ttf";
  NSString *fileName =
      [NSString stringWithFormat:@"%@.%@", [self sha256HexOfString:url.absoluteString], extension];
  NSURL *cachesURL = [NSFileManager.defaultManager URLsForDirectory:NSCachesDirectory
                                                          inDomains:NSUserDomainMask]
                         .firstObject;
  NSURL *directoryURL = [cachesURL URLByAppendingPathComponent:@"one-fonts" isDirectory:YES];
  NSURL *fileURL = [directoryURL URLByAppendingPathComponent:fileName];
  if ([NSFileManager.defaultManager fileExistsAtPath:fileURL.path]) {
    return fileURL;
  }
  NSData *data = [NSData dataWithContentsOfURL:url options:0 error:error];
  if (data == nil) {
    return nil;
  }
  if (data.length == 0) {
    if (error != NULL) {
      *error = [NSError errorWithDomain:@"OneNativeFonts"
                                   code:2
                               userInfo:@{
                                 NSLocalizedDescriptionKey :
                                     [NSString stringWithFormat:@"Fonts.load: \"%@\" downloaded zero bytes",
                                                                name]
                               }];
    }
    return nil;
  }
  if (![NSFileManager.defaultManager createDirectoryAtURL:directoryURL
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:error]) {
    return nil;
  }
  if (![data writeToURL:fileURL options:NSDataWritingAtomic error:error]) {
    return nil;
  }
  return fileURL;
}

RCT_EXPORT_METHOD(load:(NSString *)name
                  uri:(NSString *)uri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if ([self fontIsLoaded:name]) {
    resolve(nil);
    return;
  }
  NSURL *url = [NSURL URLWithString:uri];
  if (url == nil) {
    reject(@"E_FONTS_URI", [NSString stringWithFormat:@"Fonts.load: \"%@\" is not a usable uri", name],
           nil);
    return;
  }
  NSString *scheme = url.scheme.lowercaseString;
  BOOL isFile = [scheme isEqualToString:@"file"];
  BOOL isRemote = [scheme isEqualToString:@"http"] || [scheme isEqualToString:@"https"];
  if (!isFile && !isRemote) {
    reject(@"E_FONTS_URI",
           [NSString stringWithFormat:@"Fonts.load: \"%@\" uses an unsupported uri scheme \"%@\"", name,
                                      scheme],
           nil);
    return;
  }
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSError *error = nil;
    NSURL *fileURL = url;
    if (isRemote) {
      fileURL = [self cachedFileURLForFontURL:url name:name error:&error];
      if (fileURL == nil) {
        BOOL isEmpty = [error.domain isEqualToString:@"OneNativeFonts"] && error.code == 2;
        reject(@"E_FONTS_DOWNLOAD",
               isEmpty ? error.localizedDescription
                       : [NSString stringWithFormat:@"Fonts.load: \"%@\" could not be downloaded",
                                                    name],
               error);
        return;
      }
    } else if (![NSFileManager.defaultManager fileExistsAtPath:fileURL.path]) {
      reject(@"E_FONTS_URI",
             [NSString stringWithFormat:@"Fonts.load: \"%@\" points at a missing file", name], nil);
      return;
    }
    CFErrorRef registerError = NULL;
    BOOL registered =
        CTFontManagerRegisterFontsForURL((__bridge CFURLRef)fileURL, kCTFontManagerScopeProcess,
                                         &registerError);
    if (!registered && registerError != NULL) {
      CFIndex code = CFErrorGetCode(registerError);
      BOOL benign = code == kCTFontManagerErrorAlreadyRegistered ||
          code == kCTFontManagerErrorDuplicatedName;
      if (!benign) {
        NSError *nsError = (__bridge NSError *)registerError;
        reject(@"E_FONTS_REGISTER",
               [NSString stringWithFormat:@"Fonts.load: \"%@\" could not be registered", name], nsError);
        CFRelease(registerError);
        return;
      }
      CFRelease(registerError);
    }
    if (![self fontIsLoaded:name]) {
      NSArray *descriptors = (__bridge_transfer NSArray *)CTFontManagerCreateFontDescriptorsFromURL(
          (__bridge CFURLRef)fileURL);
      NSMutableArray *realNames = [NSMutableArray array];
      for (UIFontDescriptor *descriptor in descriptors) {
        NSString *postScript = [descriptor objectForKey:(__bridge NSString *)kCTFontNameAttribute];
        if (postScript.length > 0) {
          [realNames addObject:postScript];
        }
      }
      NSString *provided = realNames.count > 0
          ? [NSString stringWithFormat:@", file provides %@",
                                       [realNames componentsJoinedByString:@", "]]
          : @"";
      reject(@"E_FONTS_NAME",
             [NSString stringWithFormat:@"Fonts.load: \"%@\" is not usable after registration "
                                        @"(expected the PostScript name%@)",
                                        name, provided],
             nil);
      return;
    }
    resolve(nil);
  });
}

@end
