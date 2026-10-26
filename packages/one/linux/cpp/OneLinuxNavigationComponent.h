#pragma once

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/components/view/ViewEventEmitter.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/propsConversions.h>

namespace facebook::react {

class OneLinuxNavigationProps final : public ViewProps {
 public:
  OneLinuxNavigationProps() = default;
  OneLinuxNavigationProps(const PropsParserContext &context, const OneLinuxNavigationProps &source, const RawProps &raw)
      : ViewProps(context, source, raw),
        mode(convertRawProp(context, raw, "mode", source.mode, std::string("stack"))),
        pageKeys(convertRawProp(context, raw, "pageKeys", source.pageKeys, std::vector<std::string>{})),
        pageTitles(convertRawProp(context, raw, "pageTitles", source.pageTitles, std::vector<std::string>{})),
        title(convertRawProp(context, raw, "title", source.title, std::string{})),
        selectedIndex(convertRawProp(context, raw, "selectedIndex", source.selectedIndex, 0)),
        headerShown(convertRawProp(context, raw, "headerShown", source.headerShown, true)),
        canGoBack(convertRawProp(context, raw, "canGoBack", source.canGoBack, false)),
        revision(convertRawProp(context, raw, "revision", source.revision, 0)),
        acknowledgedEvent(convertRawProp(context, raw, "acknowledgedEvent", source.acknowledgedEvent, 0)) {}

  std::string mode{"stack"};
  std::vector<std::string> pageKeys;
  std::vector<std::string> pageTitles;
  std::string title;
  int selectedIndex{0};
  bool headerShown{true};
  bool canGoBack{false};
  int revision{0};
  int acknowledgedEvent{0};
};

class OneLinuxNavigationEventEmitter : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;
  void onSelect(int index, int eventCount, int revision) const
  {
    dispatchEvent("select", folly::dynamic::object("index", index)("eventCount", eventCount)("revision", revision), RawEvent::Category::Discrete);
  }
  void onBack() const { dispatchEvent("back", folly::dynamic::object(), RawEvent::Category::Discrete); }
};

// the header and sidebar gtk draws around the pages, measured on the main thread.
struct OneLinuxNavigationState {
  Float top{0};
  Float left{0};
};

inline constexpr char OneLinuxNavigationName[] = "OneLinuxNavigation";

// the pages are absolutely positioned inside the header and sidebar, which
// Yoga sees as the node's border, so their Fabric frames match where gtk draws
// them and measure and touch coordinates agree.
class OneLinuxNavigationShadowNode final
    : public ConcreteViewShadowNode<OneLinuxNavigationName, OneLinuxNavigationProps, OneLinuxNavigationEventEmitter, OneLinuxNavigationState> {
 public:
  using Base = ConcreteViewShadowNode<OneLinuxNavigationName, OneLinuxNavigationProps, OneLinuxNavigationEventEmitter, OneLinuxNavigationState>;

  OneLinuxNavigationShadowNode(const ShadowNodeFragment &fragment, const ShadowNodeFamily::Shared &family, ShadowNodeTraits traits)
      : Base(fragment, family, traits)
  {
    applyInsets();
  }

  OneLinuxNavigationShadowNode(const ShadowNode &source, const ShadowNodeFragment &fragment) : Base(source, fragment)
  {
    applyInsets();
    if (getState() != source.getState()) {
      dirtyLayout();
    }
  }

 private:
  void applyInsets()
  {
    const auto &insets = getStateData();
    auto &style = yogaNode_.style();
    style.setBorder(yoga::Edge::Top, yoga::StyleLength::points(insets.top));
    style.setBorder(yoga::Edge::Left, yoga::StyleLength::points(insets.left));
  }
};

} // namespace facebook::react
