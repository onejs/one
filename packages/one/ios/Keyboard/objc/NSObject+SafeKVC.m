#import "NSObject+SafeKVC.h"

@implementation NSObject (SafeKVC)
- (id)oneKC_safeValueForKey:(NSString *)key
{
  @try {
    return [self valueForKey:key];
  } @catch (NSException *exception) {
    return nil;
  }
}
@end
