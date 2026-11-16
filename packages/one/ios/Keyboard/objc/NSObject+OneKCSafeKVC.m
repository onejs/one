#import "NSObject+OneKCSafeKVC.h"

@implementation NSObject (OneKCSafeKVC)
- (id)oneKC_safeValueForKey:(NSString *)key
{
  @try {
    return [self valueForKey:key];
  } @catch (NSException *exception) {
    return nil;
  }
}
@end
