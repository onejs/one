#import "OneNativeHaptics.h"

#import <UIKit/UIKit.h>

// fire-and-forget tactile feedback, the ios half of One.UI.Haptics. a legacy
// bridge module (no codegen spec needed), like the other native modules in
// this package. one retained generator per style; each call prepares then
// fires so gesture-threshold rates stay responsive. soft/rigid need ios 13+
// and the floor is 17, so no gating.
@implementation OneNativeHaptics

RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

// requiresMainQueueSetup alone does NOT main-queue methods: it only governs
// module init timing, and RCT_EXPORT_METHODs otherwise run on the module's
// background queue. UIFeedbackGenerator is main-queue affine, so return the
// main queue here.
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

static UISelectionFeedbackGenerator *SelectionGenerator;
static UIImpactFeedbackGenerator *LightGenerator;
static UIImpactFeedbackGenerator *MediumGenerator;
static UIImpactFeedbackGenerator *HeavyGenerator;
static UIImpactFeedbackGenerator *SoftGenerator;
static UIImpactFeedbackGenerator *RigidGenerator;
static UINotificationFeedbackGenerator *NotificationGenerator;

+ (void)ensureGenerators
{
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    SelectionGenerator = [[UISelectionFeedbackGenerator alloc] init];
    LightGenerator = [[UIImpactFeedbackGenerator alloc]
        initWithStyle:UIImpactFeedbackStyleLight];
    MediumGenerator = [[UIImpactFeedbackGenerator alloc]
        initWithStyle:UIImpactFeedbackStyleMedium];
    HeavyGenerator = [[UIImpactFeedbackGenerator alloc]
        initWithStyle:UIImpactFeedbackStyleHeavy];
    SoftGenerator = [[UIImpactFeedbackGenerator alloc]
        initWithStyle:UIImpactFeedbackStyleSoft];
    RigidGenerator = [[UIImpactFeedbackGenerator alloc]
        initWithStyle:UIImpactFeedbackStyleRigid];
    NotificationGenerator = [[UINotificationFeedbackGenerator alloc] init];
  });
}

RCT_EXPORT_METHOD(selection)
{
  [OneNativeHaptics ensureGenerators];
  [SelectionGenerator prepare];
  [SelectionGenerator selectionChanged];
}

RCT_EXPORT_METHOD(impact : (NSString *)style)
{
  [OneNativeHaptics ensureGenerators];
  // android has no soft/rigid grades; ios keeps all five. unknown strings
  // no-op here: the js boundary already throws on them.
  UIImpactFeedbackGenerator *generator = nil;
  if ([style isEqualToString:@"light"]) {
    generator = LightGenerator;
  } else if ([style isEqualToString:@"medium"]) {
    generator = MediumGenerator;
  } else if ([style isEqualToString:@"heavy"]) {
    generator = HeavyGenerator;
  } else if ([style isEqualToString:@"soft"]) {
    generator = SoftGenerator;
  } else if ([style isEqualToString:@"rigid"]) {
    generator = RigidGenerator;
  }
  if (generator == nil) {
    return;
  }
  [generator prepare];
  [generator impactOccurred];
}

RCT_EXPORT_METHOD(notification : (NSString *)type)
{
  [OneNativeHaptics ensureGenerators];
  UINotificationFeedbackType feedbackType;
  if ([type isEqualToString:@"success"]) {
    feedbackType = UINotificationFeedbackTypeSuccess;
  } else if ([type isEqualToString:@"warning"]) {
    feedbackType = UINotificationFeedbackTypeWarning;
  } else if ([type isEqualToString:@"error"]) {
    feedbackType = UINotificationFeedbackTypeError;
  } else {
    return;
  }
  [NotificationGenerator prepare];
  [NotificationGenerator notificationOccurred:feedbackType];
}

@end
