#include "OneOverKeyboardViewState.h"

namespace facebook::react {

#ifdef ANDROID
folly::dynamic OneOverKeyboardViewState::getDynamic() const {
  return folly::dynamic::object("screenWidth", screenSize.width)(
      "screenHeight", screenSize.height);
}
#endif

} // namespace facebook::react
