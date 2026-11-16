#import "OneViewCulling.h"

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/featureflags/ReactNativeFeatureFlagsOverridesOSSStable.h>

namespace {
class OneViewCullingFlags
    : public facebook::react::ReactNativeFeatureFlagsOverridesOSSStable {
 public:
  bool enableViewCulling() override {
    return true;
  }
};
} // namespace

void OneEnableViewCulling(void) {
  // the factory already installed the stable release level's flags, and a
  // second override throws, so this replaces them with the same set plus culling
  facebook::react::ReactNativeFeatureFlags::dangerouslyForceOverride(
      std::make_unique<OneViewCullingFlags>());
}
