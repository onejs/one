#import <AppKit/AppKit.h>

#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/graphics/Color.h>
#include <cstdio>
#include <cstdlib>

using namespace facebook::react;

static void Check(bool condition, const char *description)
{
  std::printf("%s: %s\n", condition ? "PASS" : "FAIL", description);
  if (!condition) {
    std::exit(1);
  }
}

int main()
{
  @autoreleasepool {
    ContextContainer context;
    SharedColor absent;
    SharedColor transparent;
    fromRawValue(context, 0, RawValue(folly::dynamic(0)), transparent);
    SharedColor semanticClear = Color::createSemanticColor({"clearColor"});
    SharedColor missing = Color::createSemanticColor({"oneMissingGradientColor"});
    Check(!absent, "default SharedColor is absent");
    Check(transparent && transparent != absent, "parsed numeric transparent is defined");
    Check((*transparent).getColor() == 0, "transparent packed ARGB stays zero");
    Check(semanticClear && alphaFromColor(semanticClear) == 0, "semantic clear is defined");
    Check(!missing, "missing semantic name is undefined");
    Check(transparent == clearColor(), "numeric zero equals explicit clear color");
    Check(std::hash<SharedColor>{}(transparent) == std::hash<SharedColor>{}(clearColor()),
        "equal numeric colors hash identically");
    SharedColor anotherClear = Color::createSemanticColor({"clearColor"});
    Check(semanticClear == anotherClear &&
        std::hash<SharedColor>{}(semanticClear) == std::hash<SharedColor>{}(anotherClear),
        "equal semantic colors hash identically");
  }
}
