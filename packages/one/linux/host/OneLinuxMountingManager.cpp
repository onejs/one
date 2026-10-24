#include "OneLinuxMountingManager.h"

#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphProps.h>
#include <react/renderer/components/text/ParagraphShadowNode.h>
#include <react/renderer/components/text/RawTextComponentDescriptor.h>
#include <react/renderer/components/text/TextComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/mounting/ShadowView.h>

#include <algorithm>
#include <vector>

#include "OneLinuxRuntime.h"
#include "OneLinuxText.h"

namespace facebook::react {

namespace {

// Text and RawText are virtual nodes that never get a widget of their own
const std::vector<ComponentDescriptorProvider> &componentProviders()
{
  static const std::vector<ComponentDescriptorProvider> providers = {
      concreteComponentDescriptorProvider<RootComponentDescriptor>(),
      concreteComponentDescriptorProvider<ViewComponentDescriptor>(),
      concreteComponentDescriptorProvider<ParagraphComponentDescriptor>(),
      concreteComponentDescriptorProvider<TextComponentDescriptor>(),
      concreteComponentDescriptorProvider<RawTextComponentDescriptor>(),
  };
  return providers;
}

GdkRGBA rgba(SharedColor color)
{
  auto components = colorComponentsFromColor(color);
  return GdkRGBA{components.red, components.green, components.blue, components.alpha};
}

} // namespace

struct OneLinuxMountingManager::Record {
  Tag tag;
  ComponentHandle handle;
  // the manager's own reference, so a move through Remove and Insert never
  // finalizes the widget
  OneView *view;
  Props::Shared props;
  LayoutMetrics layoutMetrics = EmptyLayoutMetrics;
  ParagraphShadowNode::ConcreteState::Shared paragraphState;
};

std::shared_ptr<ComponentDescriptorProviderRegistry> OneLinuxMountingManager::componentDescriptorProviderRegistry()
{
  auto registry = std::make_shared<ComponentDescriptorProviderRegistry>();
  for (const auto &provider : componentProviders()) {
    registry->add(provider);
  }
  return registry;
}

bool OneLinuxMountingManager::hasComponentNamed(const std::string &name)
{
  return std::any_of(componentProviders().begin(), componentProviders().end(), [&](const auto &provider) {
    return name == provider.name;
  });
}

OneLinuxMountingManager::OneLinuxMountingManager() = default;

OneLinuxMountingManager::~OneLinuxMountingManager()
{
  for (auto &entry : records_) {
    g_object_unref(entry.second->view);
  }
}

void OneLinuxMountingManager::setContextContainer(std::shared_ptr<const ContextContainer> contextContainer)
{
  contextContainer_ = std::move(contextContainer);
}

void OneLinuxMountingManager::setComponentDescriptorRegistry(SharedComponentDescriptorRegistry registry)
{
  componentDescriptorRegistry_ = std::move(registry);
}

OneLinuxMountingManager::Record &OneLinuxMountingManager::createView(ComponentHandle handle, Tag tag)
{
  auto record = std::make_unique<Record>();
  record->tag = tag;
  record->handle = handle;
  record->view = one_view_new();
  g_object_ref_sink(record->view);
  auto &stored = *record;
  records_[tag] = std::move(record);
  return stored;
}

void OneLinuxMountingManager::attachSurface(SurfaceId surfaceId, OneView *surfaceView)
{
  surfaceId_ = surfaceId;
  surfaceView_ = surfaceView;
  auto &root = createView(RootShadowNode::Handle(), surfaceId);
  one_view_insert_child(surfaceView, root.view, 0);
}

void OneLinuxMountingManager::detachSurface(SurfaceId surfaceId)
{
  auto it = records_.find(surfaceId);
  if (it != records_.end()) {
    if (gtk_widget_get_parent(GTK_WIDGET(it->second->view))) {
      one_view_remove_child(it->second->view);
    }
    g_object_unref(it->second->view);
    records_.erase(it);
  }
  surfaceView_ = nullptr;
}

void OneLinuxMountingManager::setSurfaceSize(double width, double height)
{
  auto it = records_.find(surfaceId_);
  if (it != records_.end()) {
    one_view_set_frame(it->second->view, 0, 0, width, height);
  }
}

void OneLinuxMountingManager::scheduleTransaction(std::shared_ptr<const MountingCoordinator> coordinator)
{
  std::weak_ptr<OneLinuxMountingManager> weakSelf = weak_from_this();
  OneLinuxDispatchMain([weakSelf, coordinator = std::move(coordinator)] {
    if (auto self = weakSelf.lock()) {
      self->initiateTransaction(*coordinator);
    }
  });
}

void OneLinuxMountingManager::initiateTransaction(const MountingCoordinator &coordinator)
{
  if (transactionInFlight_) {
    followUpTransactionRequired_ = true;
    return;
  }
  do {
    followUpTransactionRequired_ = false;
    transactionInFlight_ = true;
    coordinator.getTelemetryController().pullTransaction(
        [&](const MountingTransaction &, const SurfaceTelemetry &) {},
        [&](const MountingTransaction &transaction, const SurfaceTelemetry &) {
          performMutations(transaction.getMutations());
        },
        [&](const MountingTransaction &, const SurfaceTelemetry &) {});
    transactionInFlight_ = false;
  } while (followUpTransactionRequired_);

  if (hasContent_ && !mounted_ && didMount) {
    mounted_ = true;
    didMount();
  }
}

void OneLinuxMountingManager::synchronouslyUpdateViewOnTag(Tag tag, const folly::dynamic &props)
{
  auto it = records_.find(tag);
  if (it == records_.end() || !it->second->props || !componentDescriptorRegistry_) {
    return; // an animation can finish after its target was removed
  }
  Record &record = *it->second;
  auto descriptor = componentDescriptorRegistry_->findComponentDescriptorByHandle_DO_NOT_USE_THIS_IS_BROKEN(record.handle);
  if (!descriptor) {
    return;
  }
  record.props = descriptor->cloneProps(PropsParserContext{surfaceId_, *contextContainer_}, record.props, RawProps(props));
  restyle(record);
}

void OneLinuxMountingManager::restyle(Record &record)
{
  if (!record.props) {
    return;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*record.props);
  const auto &metrics = record.layoutMetrics;
  OneView *view = record.view;

  gtk_widget_set_visible(GTK_WIDGET(view), metrics.displayType != DisplayType::None);
  one_view_set_frame(view, metrics.frame.origin.x, metrics.frame.origin.y, metrics.frame.size.width, metrics.frame.size.height);
  gtk_widget_set_opacity(GTK_WIDGET(view), viewProps.opacity);

  if (viewProps.backgroundColor) {
    GdkRGBA background = rgba(viewProps.backgroundColor);
    one_view_set_background(view, &background);
  } else {
    one_view_set_background(view, nullptr);
  }

  const auto border = viewProps.resolveBorderMetrics(metrics);
  double radius = std::min<double>(
      border.borderRadii.topLeft.horizontal, std::min(metrics.frame.size.width, metrics.frame.size.height) / 2);
  one_view_set_radius(view, radius);
  if (border.borderWidths.top > 0 && border.borderColors.top) {
    GdkRGBA color = rgba(border.borderColors.top);
    one_view_set_border(view, border.borderWidths.top, &color);
  } else {
    one_view_set_border(view, 0, nullptr);
  }
  one_view_set_clips(view, viewProps.getClipsContentToBounds());

  if (record.paragraphState) {
    const auto &data = record.paragraphState->getData();
    const auto frame = metrics.getContentFrame();
    PangoLayout *layout = OneLinuxCreateLayout(data.attributedString, data.paragraphAttributes, frame.size.width, true);
    one_view_set_text(view, layout, frame.origin.x, frame.origin.y);
    g_object_unref(layout);
  }
}

void OneLinuxMountingManager::performMutations(const ShadowViewMutationList &mutations)
{
  for (const auto &mutation : mutations) {
    switch (mutation.type) {
      case ShadowViewMutation::Create: {
        const auto &child = mutation.newChildShadowView;
        createView(child.componentHandle, child.tag);
        break;
      }

      case ShadowViewMutation::Delete: {
        auto it = records_.find(mutation.oldChildShadowView.tag);
        if (it != records_.end()) {
          g_object_unref(it->second->view);
          records_.erase(it);
        }
        break;
      }

      case ShadowViewMutation::Insert: {
        const auto &child = mutation.newChildShadowView;
        auto childIt = records_.find(child.tag);
        auto parentIt = records_.find(mutation.parentTag);
        if (childIt == records_.end() || parentIt == records_.end()) {
          break;
        }
        Record &record = *childIt->second;
        record.props = child.props;
        record.layoutMetrics = child.layoutMetrics;
        record.paragraphState = std::dynamic_pointer_cast<const ParagraphShadowNode::ConcreteState>(child.state);
        restyle(record);
        one_view_insert_child(parentIt->second->view, record.view, mutation.index);
        hasContent_ = true;
        break;
      }

      case ShadowViewMutation::Remove: {
        auto childIt = records_.find(mutation.oldChildShadowView.tag);
        if (childIt != records_.end() && gtk_widget_get_parent(GTK_WIDGET(childIt->second->view))) {
          one_view_remove_child(childIt->second->view);
        }
        break;
      }

      case ShadowViewMutation::Update: {
        const auto &oldChild = mutation.oldChildShadowView;
        const auto &newChild = mutation.newChildShadowView;
        auto it = records_.find(newChild.tag);
        if (it == records_.end()) {
          break;
        }
        Record &record = *it->second;
        bool changed = false;
        if (oldChild.props != newChild.props) {
          record.props = newChild.props;
          changed = true;
        }
        if (oldChild.layoutMetrics != newChild.layoutMetrics) {
          record.layoutMetrics = newChild.layoutMetrics;
          changed = true;
        }
        if (oldChild.state != newChild.state) {
          record.paragraphState = std::dynamic_pointer_cast<const ParagraphShadowNode::ConcreteState>(newChild.state);
          changed = true;
        }
        if (changed) {
          restyle(record);
        }
        break;
      }
    }
  }
}

} // namespace facebook::react
