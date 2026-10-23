#pragma once

#include <react/debug/react_native_expect.h>
#include <react/renderer/core/RawValue.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/graphics/fromRawValueShared.h>
#include <react/utils/ContextContainer.h>

namespace facebook::react {

// PlatformColor('labelColor', ...) arrives as {semantic: names, fallback?}
SharedColor parsePlatformColor(const ContextContainer &contextContainer, int32_t surfaceId, const RawValue &value);

inline void
fromRawValue(const ContextContainer &contextContainer, int32_t surfaceId, const RawValue &value, SharedColor &result)
{
  fromRawValueShared(contextContainer, surfaceId, value, result, parsePlatformColor);
}

} // namespace facebook::react
