#pragma once

#include <jsi/jsi.h>
#include <memory>

namespace facebook::bun {

// marker a bundle starts with when the compiled program stands in for it
inline constexpr char kCompiledEntryMarker[] = "/*bun-compiled-entry*/";

// starts bun's runtime for the compiled program on the calling thread, which
// must be the only thread that uses it; null when no program is embedded
std::unique_ptr<jsi::Runtime> makeBunRuntime();

} // namespace facebook::bun
