#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/PropsParserContext.h>
namespace facebook::react {
class OneMacImageProps final : public ViewProps {
 public:
  OneMacImageProps() = default;
  OneMacImageProps(const PropsParserContext &, const OneMacImageProps &, const RawProps &);
  std::string systemName{};
  Float size{16};
  bool fitToBounds{false};
  SharedColor tintColor{};
};
}
