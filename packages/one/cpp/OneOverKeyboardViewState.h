#pragma once

#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/graphics/Float.h>

#ifdef ANDROID
#include <folly/dynamic.h>
#endif

#include <memory>

namespace facebook::react {

/*
 * State for <OneOverKeyboardViewState> component.
 */
class OneOverKeyboardViewState final {
 public:
  using Shared = std::shared_ptr<const OneOverKeyboardViewState>;


  OneOverKeyboardViewState() {}
  OneOverKeyboardViewState(Size screenSize_) : screenSize(screenSize_) {}

#ifdef ANDROID
  OneOverKeyboardViewState(
      const OneOverKeyboardViewState& previousState,
      folly::dynamic data)
      : screenSize(Size{
            (Float)data["screenWidth"].getDouble(),
            (Float)data["screenHeight"].getDouble()}) {}
#endif

  const Size screenSize{};

#ifdef ANDROID
  folly::dynamic getDynamic() const;
#endif

#pragma mark - Getters
};

} // namespace facebook::react
