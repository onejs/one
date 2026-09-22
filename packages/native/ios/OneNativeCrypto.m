#import "OneNativeCrypto.h"

#import <Security/Security.h>

// secure random bytes for the crypto polyfill: a legacy bridge module (no
// codegen spec needed), like the other native modules in this package. one
// blocking sync method returning lowercase hex; nil means SecRandomCopyBytes
// failed and the js side throws rather than falling back to Math.random.
@implementation OneNativeCrypto

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getRandomBytesHex : (nonnull NSNumber *)countNumber)
{
  long count = [countNumber longValue];
  if (count < 0 || count > 65536) {
    return nil;
  }
  if (count == 0) {
    return @"";
  }
  uint8_t *bytes = malloc((size_t)count);
  if (bytes == NULL) {
    return nil;
  }
  OSStatus status = SecRandomCopyBytes(kSecRandomDefault, (size_t)count, bytes);
  if (status != errSecSuccess) {
    free(bytes);
    return nil;
  }
  static const char digits[] = "0123456789abcdef";
  char *hex = malloc((size_t)(count * 2 + 1));
  if (hex == NULL) {
    free(bytes);
    return nil;
  }
  for (long i = 0; i < count; i++) {
    hex[i * 2] = digits[bytes[i] >> 4];
    hex[i * 2 + 1] = digits[bytes[i] & 15];
  }
  hex[count * 2] = '\0';
  NSString *result = [NSString stringWithUTF8String:hex];
  free(hex);
  free(bytes);
  return result;
}

@end
