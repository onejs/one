#include "OneLinuxMountingManager.h"

#include <react/renderer/components/image/ImageComponentDescriptor.h>
#include <react/renderer/components/image/ImageEventEmitter.h>
#include <react/renderer/components/image/ImageProps.h>
#include <react/renderer/components/image/ImageShadowNode.h>
#include <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/root/RootComponentDescriptor.h>
#include <react/renderer/components/scrollview/ScrollViewComponentDescriptor.h>
#include <react/renderer/components/scrollview/ScrollViewEventEmitter.h>
#include <react/renderer/components/scrollview/ScrollViewProps.h>
#include <react/renderer/components/text/ParagraphComponentDescriptor.h>
#include <react/renderer/components/text/ParagraphProps.h>
#include <react/renderer/components/text/ParagraphShadowNode.h>
#include <react/renderer/components/text/RawTextComponentDescriptor.h>
#include <react/renderer/components/text/TextComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/imagemanager/ImageResponse.h>
#include <react/renderer/imagemanager/ImageResponseObserver.h>
#include <react/renderer/mounting/ShadowView.h>

#include <algorithm>
#include <cmath>
#include <vector>

#include "OneLinuxControl.h"
#include "OneLinuxNavigation.h"

#include "OneLinuxRuntime.h"
#include "OneLinuxText.h"
#include "OneLinuxTextInput.h"

namespace facebook::react {

namespace {

// Text and RawText are virtual nodes that never get a widget of their own
const std::vector<ComponentDescriptorProvider> &componentProviders()
{
  static const std::vector<ComponentDescriptorProvider> providers = {
      concreteComponentDescriptorProvider<RootComponentDescriptor>(),
      concreteComponentDescriptorProvider<ViewComponentDescriptor>(),
      concreteComponentDescriptorProvider<ScrollViewComponentDescriptor>(),
      concreteComponentDescriptorProvider<ImageComponentDescriptor>(),
      concreteComponentDescriptorProvider<ParagraphComponentDescriptor>(),
      concreteComponentDescriptorProvider<TextComponentDescriptor>(),
      concreteComponentDescriptorProvider<RawTextComponentDescriptor>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxSwitchShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxButtonShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxSegmentedControlShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxSliderShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxDropDownShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxProgressBarShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxToggleShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxStepperShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxTextFieldShadowNode>>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxSecureFieldShadowNode>>(),
      concreteComponentDescriptorProvider<TextInputComponentDescriptor>(),
      concreteComponentDescriptorProvider<ConcreteComponentDescriptor<OneLinuxNavigationShadowNode>>(),
  };
  return providers;
}

GdkRGBA rgba(SharedColor color)
{
  auto components = colorComponentsFromColor(color);
  return GdkRGBA{components.red, components.green, components.blue, components.alpha};
}

// the loader reports from the thread it finished on; the manager applies the
// result on the main one
class ImageObserver final : public ImageResponseObserver {
 public:
  ImageObserver(std::weak_ptr<OneLinuxMountingManager> manager, Tag tag, uint64_t requestId)
      : manager_(std::move(manager)), tag_(tag), requestId_(requestId) {}

  void didReceiveProgress(float progress, int64_t loaded, int64_t total) const override
  {
    OneLinuxDispatchMain([manager = manager_, tag = tag_, requestId = requestId_, progress, loaded, total] {
      if (auto self = manager.lock()) {
        self->imageProgress(tag, requestId, progress, loaded, total);
      }
    });
  }

  void didReceiveImage(const ImageResponse &imageResponse) const override
  {
    OneLinuxDispatchMain([manager = manager_, tag = tag_, requestId = requestId_, texture = imageResponse.getImage()] {
      if (auto self = manager.lock()) {
        self->imageLoaded(tag, requestId, texture);
      }
    });
  }

  void didReceiveFailure(const ImageLoadError &error) const override
  {
    auto message = std::static_pointer_cast<std::string>(error.getError());
    OneLinuxDispatchMain([manager = manager_, tag = tag_, requestId = requestId_, text = message ? *message : std::string("image failed to load")] {
      if (auto self = manager.lock()) {
        self->imageFailed(tag, requestId, text);
      }
    });
  }

 private:
  std::weak_ptr<OneLinuxMountingManager> manager_;
  Tag tag_;
  uint64_t requestId_;
};

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
  EventEmitter::Shared eventEmitter;
  // where React children go: the view itself, or a scroll view's content view
  OneView *container;
  ScrollViewShadowNode::ConcreteState::Shared scrollState;
  bool scrollEnabled{true};
  gint64 lastScrollEvent{0};
  guint commitSource{0};
  std::unique_ptr<OneLinuxTextInput> input;
  std::unique_ptr<OneLinuxControl> nativeControl;
  std::unique_ptr<OneLinuxNavigation> navigation;
  ConcreteState<OneLinuxControlState>::Shared controlState;
  Size measuredControlSize{-1, -1};
  bool needsMeasurement{true};
  TextInputShadowNode::ConcreteState::Shared inputState;
  ImageShadowNode::ConcreteState::Shared imageState;
  std::shared_ptr<const ImageObserver> imageObserver;
  std::shared_ptr<const ImageResponseObserverCoordinator> imageCoordinator;
  GdkTexture *texture{nullptr};
  uint64_t imageRequestId{0};
};

static ScrollEvent scrollEventFor(OneLinuxMountingManager::Record &record);

// the offset reaches React's state shortly after scrolling settles, which is
// where measure() reads it; scrollEventThrottle is in milliseconds and 0 sends
// every change
static gboolean commitScrollOffset(gpointer data)
{
  auto &record = *static_cast<OneLinuxMountingManager::Record *>(data);
  record.commitSource = 0;
  if (record.scrollState) {
    double x, y;
    one_view_get_scroll_offset(record.view, &x, &y);
    auto stateData = record.scrollState->getData();
    Point offset{static_cast<Float>(x), static_cast<Float>(y)};
    if (stateData.contentOffset != offset) {
      stateData.contentOffset = offset;
      record.scrollState->updateState(std::move(stateData));
    }
  }
  return G_SOURCE_REMOVE;
}

static void scrolled(GtkAdjustment *, gpointer data)
{
  auto &record = *static_cast<OneLinuxMountingManager::Record *>(data);
  if (!record.props) {
    return;
  }
  if (auto emitter = std::static_pointer_cast<const ScrollViewEventEmitter>(record.eventEmitter)) {
    gint64 now = g_get_monotonic_time();
    double throttle = static_cast<const ScrollViewProps &>(*record.props).scrollEventThrottle * 1000.0;
    if (record.lastScrollEvent == 0 || now - record.lastScrollEvent > throttle) {
      record.lastScrollEvent = now;
      emitter->onScroll(scrollEventFor(record));
    }
  }
  if (record.commitSource) {
    g_source_remove(record.commitSource);
  }
  record.commitSource = g_timeout_add(100, commitScrollOffset, &record);
}

static gboolean blockScroll(GtkEventControllerScroll *, double, double, gpointer data)
{
  return !static_cast<OneLinuxMountingManager::Record *>(data)->scrollEnabled;
}

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

void OneLinuxMountingManager::releaseRecord(Record &record)
{
  if (record.commitSource) {
    g_source_remove(record.commitSource);
    record.commitSource = 0;
  }
  if (GtkWidget *control = one_view_get_control(record.view); control && GTK_IS_SCROLLED_WINDOW(control)) {
    auto *scrollWindow = GTK_SCROLLED_WINDOW(control);
    g_signal_handlers_disconnect_by_data(gtk_scrolled_window_get_hadjustment(scrollWindow), &record);
    g_signal_handlers_disconnect_by_data(gtk_scrolled_window_get_vadjustment(scrollWindow), &record);
  }
  if (record.imageCoordinator) {
    record.imageCoordinator->removeObserver(record.imageObserver);
  }
  g_clear_object(&record.texture);
  record.input.reset();
  record.nativeControl.reset();
  record.navigation.reset();
  one_view_set_owner(record.view, nullptr);
  g_object_unref(record.view);
}

OneLinuxMountingManager::~OneLinuxMountingManager()
{
  for (auto &entry : records_) {
    releaseRecord(*entry.second);
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
  one_view_set_owner(record->view, &stored);
  record->container = record->view;
  if (handle == TextInputShadowNode::Handle()) {
    record->input = std::make_unique<OneLinuxTextInput>(tag);
    one_view_set_control(record->view, record->input->widget());
  }
  if (OneLinuxControl::supports(handle)) {
    record->nativeControl = std::make_unique<OneLinuxControl>(handle);
    one_view_set_control(record->view, record->nativeControl->widget());
  }
  if (handle == OneLinuxNavigationShadowNode::Handle()) {
    record->navigation = std::make_unique<OneLinuxNavigation>(record->view);
    one_view_set_control(record->view, record->navigation->widget());
  }
  if (handle == ScrollViewShadowNode::Handle()) {
    GtkWidget *scrollWindow = gtk_scrolled_window_new();
    OneView *content = one_view_new();
    one_view_set_scroll(record->view, GTK_SCROLLED_WINDOW(scrollWindow), content);
    record->container = content;
    GtkEventController *wheel = gtk_event_controller_scroll_new(
        static_cast<GtkEventControllerScrollFlags>(GTK_EVENT_CONTROLLER_SCROLL_BOTH_AXES | GTK_EVENT_CONTROLLER_SCROLL_KINETIC));
    gtk_event_controller_set_propagation_phase(wheel, GTK_PHASE_CAPTURE);
    g_signal_connect(wheel, "scroll", G_CALLBACK(blockScroll), &stored);
    gtk_widget_add_controller(scrollWindow, wheel);
    g_signal_connect(gtk_scrolled_window_get_hadjustment(GTK_SCROLLED_WINDOW(scrollWindow)), "value-changed", G_CALLBACK(scrolled), &stored);
    g_signal_connect(gtk_scrolled_window_get_vadjustment(GTK_SCROLLED_WINDOW(scrollWindow)), "value-changed", G_CALLBACK(scrolled), &stored);
  }
  records_[tag] = std::move(record);
  return stored;
}

void OneLinuxMountingManager::attachSurface(SurfaceId surfaceId, OneView *surfaceView)
{
  surfaceId_ = surfaceId;
  surfaceView_ = surfaceView;
  auto &root = createView(RootShadowNode::Handle(), surfaceId);
  one_view_insert_child(surfaceView, root.view, 0);
  pointer_ = std::make_unique<OneLinuxPointerHandler>(
      surfaceView,
      [this](OneView *view, OneLinuxPointerTarget &target) {
        auto *record = static_cast<Record *>(one_view_get_owner(view));
        if (!record || !record->props) {
          return false;
        }
        target.tag = record->tag;
        const auto &props = static_cast<const ViewProps &>(*record->props);
        target.pointerEvents = props.pointerEvents;
        target.cursor = props.cursor;
        return true;
      },
      [this](Tag tag) -> std::shared_ptr<const EventEmitter> {
        auto it = records_.find(tag);
        return it == records_.end() ? nullptr : it->second->eventEmitter;
      },
      [this](Tag tag) -> OneView * {
        auto it = records_.find(tag);
        return it == records_.end() ? nullptr : it->second->view;
      });
}

void OneLinuxMountingManager::detachSurface(SurfaceId surfaceId)
{
  pointer_.reset();
  auto it = records_.find(surfaceId);
  if (it != records_.end()) {
    if (gtk_widget_get_parent(GTK_WIDGET(it->second->view))) {
      one_view_remove_child(it->second->view);
    }
    releaseRecord(*it->second);
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
  // native measurement commits reenter the active mount before gtk can paint.
  if (g_main_context_is_owner(g_main_context_default())) {
    initiateTransaction(*coordinator);
    return;
  }
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

// a new source starts a new request: the old texture goes and the view
// observes the new request, which reports through the Image events
void OneLinuxMountingManager::updateImageState(Record &record, const State::Shared &state)
{
  auto imageState = std::dynamic_pointer_cast<const ImageShadowNode::ConcreteState>(state);
  if (!imageState) {
    return;
  }
  auto coordinator = imageState->getData().getImageRequest().getSharedObserverCoordinator();
  record.imageState = imageState;
  if (record.imageCoordinator == coordinator) {
    return;
  }
  if (record.imageCoordinator) {
    record.imageCoordinator->removeObserver(record.imageObserver);
  }
  g_clear_object(&record.texture);
  record.imageRequestId = ++nextImageRequestId_;
  record.imageObserver = std::make_shared<const ImageObserver>(weak_from_this(), record.tag, record.imageRequestId);
  record.imageCoordinator = std::move(coordinator);
  if (auto emitter = std::static_pointer_cast<const ImageEventEmitter>(record.eventEmitter)) {
    emitter->onLoadStart();
  }
  record.imageCoordinator->addObserver(record.imageObserver);
}

void OneLinuxMountingManager::imageProgress(Tag tag, uint64_t requestId, float progress, int64_t loaded, int64_t total)
{
  auto it = records_.find(tag);
  if (it != records_.end() && it->second->imageRequestId == requestId) {
    if (auto emitter = std::static_pointer_cast<const ImageEventEmitter>(it->second->eventEmitter)) {
      emitter->onProgress(progress, loaded, total);
    }
  }
}

void OneLinuxMountingManager::imageLoaded(Tag tag, uint64_t requestId, std::shared_ptr<void> texture)
{
  auto it = records_.find(tag);
  if (it == records_.end() || it->second->imageRequestId != requestId || !it->second->imageState) {
    return;
  }
  Record &record = *it->second;
  g_set_object(&record.texture, GDK_TEXTURE(texture.get()));
  restyle(record);
  if (auto emitter = std::static_pointer_cast<const ImageEventEmitter>(record.eventEmitter)) {
    ImageSource source = record.imageState->getData().getImageSource();
    double scale = source.scale > 0 ? source.scale : 1;
    source.size = {
        static_cast<Float>(gdk_texture_get_width(record.texture) / scale), static_cast<Float>(gdk_texture_get_height(record.texture) / scale)};
    emitter->onLoad(source);
    emitter->onLoadEnd();
  }
}

void OneLinuxMountingManager::imageFailed(Tag tag, uint64_t requestId, const std::string &message)
{
  auto it = records_.find(tag);
  if (it != records_.end() && it->second->imageRequestId == requestId) {
    if (auto emitter = std::static_pointer_cast<const ImageEventEmitter>(it->second->eventEmitter)) {
      ImageErrorInfo info;
      info.error = message;
      emitter->onError(info);
      emitter->onLoadEnd();
    }
  }
}

void OneLinuxMountingManager::restyle(Record &record)
{
  if (!record.props) {
    return;
  }
  const auto &viewProps = static_cast<const ViewProps &>(*record.props);
  const auto &metrics = record.layoutMetrics;
  OneView *view = record.view;

  one_view_set_pointer_events(view,
      viewProps.pointerEvents == PointerEventsMode::Auto || viewProps.pointerEvents == PointerEventsMode::BoxOnly,
      viewProps.pointerEvents == PointerEventsMode::Auto || viewProps.pointerEvents == PointerEventsMode::BoxNone);
  gtk_widget_set_visible(GTK_WIDGET(view), metrics.displayType != DisplayType::None);
  one_view_set_frame(view, metrics.frame.origin.x, metrics.frame.origin.y, metrics.frame.size.width, metrics.frame.size.height);
  gtk_widget_set_opacity(GTK_WIDGET(view), viewProps.opacity);
  const Transform transform = viewProps.resolveTransform(metrics);
  one_view_set_transform(view, transform == Transform::Identity() ? nullptr : transform.matrix.data());

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

  if (record.nativeControl) {
    record.needsMeasurement |= record.nativeControl->update(std::static_pointer_cast<const OneLinuxControlProps>(record.props), record.eventEmitter);
  }
  if (record.navigation) record.navigation->update(std::static_pointer_cast<const OneLinuxNavigationProps>(record.props), record.eventEmitter);

  if (record.input) {
    // the field sits in the content frame, inside the padding and border
    const auto content = metrics.getContentFrame();
    GtkWidget *field = record.input->widget();
    gtk_widget_set_margin_start(field, std::lround(content.origin.x));
    gtk_widget_set_margin_top(field, std::lround(content.origin.y));
    gtk_widget_set_margin_end(field, std::max<long>(0, std::lround(metrics.frame.size.width - content.origin.x - content.size.width)));
    gtk_widget_set_margin_bottom(field, std::max<long>(0, std::lround(metrics.frame.size.height - content.origin.y - content.size.height)));
    record.input->update(record.props, record.eventEmitter, record.inputState, {static_cast<Float>(metrics.frame.size.width), static_cast<Float>(metrics.frame.size.height)});
  }

  if (record.scrollState) {
    const auto &scrollProps = static_cast<const ScrollViewProps &>(*record.props);
    auto *scrollWindow = GTK_SCROLLED_WINDOW(one_view_get_control(view));
    // the axis that does not scroll is external, so the scrolled window never
    // asks for the content's full size
    gtk_scrolled_window_set_policy(
        scrollWindow,
        scrollProps.horizontal && scrollProps.showsHorizontalScrollIndicator ? GTK_POLICY_AUTOMATIC : GTK_POLICY_EXTERNAL,
        !scrollProps.horizontal && scrollProps.showsVerticalScrollIndicator ? GTK_POLICY_AUTOMATIC : GTK_POLICY_EXTERNAL);
    record.scrollEnabled = scrollProps.scrollEnabled;
    auto contentSize = record.scrollState->getData().getContentSize();
    one_view_set_frame(record.container, 0, 0, contentSize.width, contentSize.height);
  }

  if (record.imageState) {
    const auto &imageProps = static_cast<const ImageProps &>(*record.props);
    OneImageFit fit = ONE_IMAGE_COVER;
    switch (imageProps.resizeMode) {
      case ImageResizeMode::Cover: fit = ONE_IMAGE_COVER; break;
      case ImageResizeMode::Contain: fit = ONE_IMAGE_CONTAIN; break;
      case ImageResizeMode::Stretch: fit = ONE_IMAGE_STRETCH; break;
      case ImageResizeMode::Center: fit = ONE_IMAGE_CENTER; break;
      case ImageResizeMode::Repeat: fit = ONE_IMAGE_REPEAT; break;
      case ImageResizeMode::None: fit = ONE_IMAGE_NONE; break;
    }
    GdkRGBA tint;
    bool tinted = imageProps.tintColor && *imageProps.tintColor;
    if (tinted) {
      tint = rgba(*imageProps.tintColor);
    }
    one_view_set_image(view, record.texture, record.imageState->getData().getImageSource().scale, fit, tinted ? &tint : nullptr);
  }

  if (record.paragraphState) {
    const auto &data = record.paragraphState->getData();
    const auto frame = metrics.getContentFrame();
    PangoLayout *layout = OneLinuxCreateLayout(data.attributedString, data.paragraphAttributes, frame.size.width, true);
    one_view_set_text(view, layout, frame.origin.x, frame.origin.y);
    g_object_unref(layout);
  }
}

void OneLinuxMountingManager::measureControl(Record &record, ControlMeasurements &measurements)
{
  if (!record.controlState) {
    return;
  }
  GtkWidget *widget = record.nativeControl->widget();
  int minimum, width, height;
  gtk_widget_measure(widget, GTK_ORIENTATION_HORIZONTAL, -1, &minimum, &width, nullptr, nullptr);
  gtk_widget_measure(widget, GTK_ORIENTATION_VERTICAL, width, &minimum, &height, nullptr, nullptr);
  Size size{static_cast<Float>(width), static_cast<Float>(height)};
  if (record.measuredControlSize != size) {
    record.measuredControlSize = size;
    measurements.emplace(record.tag, std::make_pair(record.props, size));
  }
}

void OneLinuxMountingManager::flushControlMeasurements(bool force)
{
  ControlMeasurements measurements;
  for (auto &[tag, record] : records_) {
    if (force || record->needsMeasurement) {
      record->needsMeasurement = false;
      measureControl(*record, measurements);
    }
  }
  if (!measurements.empty() && didMeasureControls) didMeasureControls(measurements);
}

void OneLinuxMountingManager::measureControls()
{
  flushControlMeasurements(true);
}

static ScrollEvent scrollEventFor(OneLinuxMountingManager::Record &record)
{
  ScrollEvent event;
  double x, y, frameX, frameY, width, height;
  one_view_get_scroll_offset(record.view, &x, &y);
  one_view_get_frame(record.view, &frameX, &frameY, &width, &height);
  auto contentSize = record.scrollState ? record.scrollState->getData().getContentSize() : Size{};
  event.contentSize = contentSize;
  event.contentOffset = {static_cast<Float>(x), static_cast<Float>(y)};
  event.contentInset = {};
  event.containerSize = {static_cast<Float>(width), static_cast<Float>(height)};
  event.zoomScale = 1;
  event.timestamp = static_cast<Float>(g_get_monotonic_time() / 1e6);
  return event;
}

void OneLinuxMountingManager::dispatchCommand(Tag tag, const std::string &name, const folly::dynamic &args)
{
  auto it = records_.find(tag);
  if (it == records_.end()) {
    return;
  }
  Record &record = *it->second;
  if (record.input) {
    record.input->command(name, args);
    return;
  }
  if (!record.scrollState) {
    return;
  }
  auto *scrollWindow = GTK_SCROLLED_WINDOW(one_view_get_control(record.view));
  GtkAdjustment *horizontal = gtk_scrolled_window_get_hadjustment(scrollWindow);
  GtkAdjustment *vertical = gtk_scrolled_window_get_vadjustment(scrollWindow);
  auto clampedSet = [](GtkAdjustment *adjustment, double value) {
    double most = std::max(0.0, gtk_adjustment_get_upper(adjustment) - gtk_adjustment_get_page_size(adjustment));
    gtk_adjustment_set_value(adjustment, std::clamp(value, 0.0, most));
  };
  // animated scrolls jump, as the other desktop host's non animated path does
  if (name == "scrollTo" && args.size() >= 3) {
    clampedSet(horizontal, args[0].asDouble());
    clampedSet(vertical, args[1].asDouble());
  } else if (name == "scrollToEnd" && args.size() >= 1) {
    bool isHorizontal = static_cast<const ScrollViewProps &>(*record.props).horizontal;
    clampedSet(isHorizontal ? horizontal : vertical, G_MAXDOUBLE);
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
          releaseRecord(*it->second);
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
        record.eventEmitter = child.eventEmitter;
        record.layoutMetrics = child.layoutMetrics;
        record.paragraphState = std::dynamic_pointer_cast<const ParagraphShadowNode::ConcreteState>(child.state);
        record.scrollState = std::dynamic_pointer_cast<const ScrollViewShadowNode::ConcreteState>(child.state);
        record.inputState = std::dynamic_pointer_cast<const TextInputShadowNode::ConcreteState>(child.state);
        record.controlState = std::dynamic_pointer_cast<const ConcreteState<OneLinuxControlState>>(child.state);
        updateImageState(record, child.state);
        restyle(record);
        if (parentIt->second->navigation) parentIt->second->navigation->insert(record.view, mutation.index);
        else one_view_insert_child(parentIt->second->container, record.view, mutation.index);
        hasContent_ = true;
        break;
      }

      case ShadowViewMutation::Remove: {
        auto childIt = records_.find(mutation.oldChildShadowView.tag);
        if (childIt != records_.end() && gtk_widget_get_parent(GTK_WIDGET(childIt->second->view))) {
          auto parent = records_.find(mutation.parentTag);
          if (parent != records_.end() && parent->second->navigation) parent->second->navigation->remove(childIt->second->view);
          else one_view_remove_child(childIt->second->view);
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
        record.eventEmitter = newChild.eventEmitter;
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
          record.scrollState = std::dynamic_pointer_cast<const ScrollViewShadowNode::ConcreteState>(newChild.state);
          record.inputState = std::dynamic_pointer_cast<const TextInputShadowNode::ConcreteState>(newChild.state);
          record.controlState = std::dynamic_pointer_cast<const ConcreteState<OneLinuxControlState>>(newChild.state);
          updateImageState(record, newChild.state);
          changed = true;
        }
        if (changed) {
          restyle(record);
        }
        break;
      }
    }
  }
  for (auto &[tag, record] : records_) if (record->navigation) record->navigation->sync();
  flushControlMeasurements(false);
}

} // namespace facebook::react
