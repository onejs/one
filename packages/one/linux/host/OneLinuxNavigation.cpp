#include "OneLinuxNavigation.h"

#include <algorithm>

namespace facebook::react {

OneLinuxNavigation::OneLinuxNavigation(OneView *owner) : owner_(owner)
{
  one_view_set_navigation_handlers(owner_, +[](gpointer data) { return static_cast<OneLinuxNavigation *>(data)->visiblePage(); },
      +[](gpointer data) { static_cast<OneLinuxNavigation *>(data)->allocated(); }, this);
  box_ = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
  g_object_ref_sink(box_);
  header_ = gtk_header_bar_new();
  gtk_header_bar_set_show_title_buttons(GTK_HEADER_BAR(header_), FALSE);
  title_ = gtk_label_new("");
  g_object_ref_sink(title_);
  gtk_widget_add_css_class(title_, "title");
  gtk_header_bar_set_title_widget(GTK_HEADER_BAR(header_), title_);
  back_ = gtk_button_new_from_icon_name("go-previous-symbolic");
  gtk_widget_set_tooltip_text(back_, "Back");
  gtk_header_bar_pack_start(GTK_HEADER_BAR(header_), back_);
  g_signal_connect(back_, "clicked", G_CALLBACK(+[](GtkButton *, gpointer data) {
    auto &self = *static_cast<OneLinuxNavigation *>(data);
    if (self.emitter_) self.emitter_->onBack();
  }), this);
  gtk_box_append(GTK_BOX(box_), header_);
  row_ = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);
  gtk_widget_set_vexpand(row_, TRUE);
  gtk_box_append(GTK_BOX(box_), row_);
  stack_ = GTK_STACK(gtk_stack_new());
  gtk_stack_set_transition_type(stack_, GTK_STACK_TRANSITION_TYPE_NONE);
  gtk_stack_set_hhomogeneous(stack_, FALSE);
  gtk_stack_set_vhomogeneous(stack_, FALSE);
  gtk_widget_set_hexpand(GTK_WIDGET(stack_), TRUE);
  gtk_widget_set_vexpand(GTK_WIDGET(stack_), TRUE);
  sidebar_ = gtk_stack_sidebar_new();
  gtk_stack_sidebar_set_stack(GTK_STACK_SIDEBAR(sidebar_), stack_);
  gtk_widget_set_visible(sidebar_, FALSE);
  gtk_box_append(GTK_BOX(row_), sidebar_);
  gtk_box_append(GTK_BOX(row_), GTK_WIDGET(stack_));
  switcher_ = gtk_stack_switcher_new();
  g_object_ref_sink(switcher_);
  gtk_stack_switcher_set_stack(GTK_STACK_SWITCHER(switcher_), stack_);
  gtk_widget_set_halign(switcher_, GTK_ALIGN_CENTER);
  gtk_widget_set_visible(switcher_, FALSE);
  size_t controllerIndex = 0;
  for (GtkWidget *widget : {switcher_, sidebar_}) {
    auto *controller = gtk_event_controller_legacy_new();
    gtk_event_controller_set_propagation_phase(controller, GTK_PHASE_CAPTURE);
    g_signal_connect(controller, "event", G_CALLBACK(repeatEvent), this);
    gtk_widget_add_controller(widget, controller);
    repeatControllers_[controllerIndex++] = controller;
  }
  g_signal_connect(stack_, "notify::visible-child", G_CALLBACK(+[](GObject *, GParamSpec *, gpointer data) {
    auto &self = *static_cast<OneLinuxNavigation *>(data);
    if (self.applying_ || !self.emitter_) return;
    auto *visible = self.visiblePage();
    auto found = std::find(self.children_.begin(), self.children_.end(), visible);
    if (found == self.children_.end()) return;
    int index = static_cast<int>(found - self.children_.begin());
    self.select(index);
  }), this);
}

OneLinuxNavigation::~OneLinuxNavigation()
{
  one_view_set_navigation_handlers(owner_, nullptr, nullptr, nullptr);
  for (auto *controller : repeatControllers_) {
    auto *widget = gtk_event_controller_get_widget(controller);
    g_signal_handlers_disconnect_by_data(controller, this);
    gtk_widget_remove_controller(widget, controller);
  }
  g_signal_handlers_disconnect_by_data(stack_, this);
  g_signal_handlers_disconnect_by_data(back_, this);
  // fabric owns each page's reference and removes it before deleting its record.
  for (auto *child : children_) gtk_stack_remove(stack_, GTK_WIDGET(child));
  g_object_unref(box_);
  g_object_unref(title_);
  g_object_unref(switcher_);
}

void OneLinuxNavigation::select(int index)
{
  if (emitter_ && selection_.record(index)) emitter_->onSelect(index, selection_.eventCount(), selection_.revision());
}

gboolean OneLinuxNavigation::repeatEvent(GtkEventControllerLegacy *controller, GdkEvent *event, gpointer data)
{
  auto &self = *static_cast<OneLinuxNavigation *>(data);
  auto type = gdk_event_get_event_type(event);
  if ((type != GDK_BUTTON_PRESS && type != GDK_BUTTON_RELEASE) || gdk_button_event_get_button(event) != GDK_BUTTON_PRIMARY) return FALSE;
  auto *widget = gtk_event_controller_get_widget(GTK_EVENT_CONTROLLER(controller));
  auto *native = gtk_widget_get_native(widget);
  if (!native || gdk_event_get_surface(event) != gtk_native_get_surface(native)) return FALSE;
  double x, y, offsetX, offsetY;
  gdk_event_get_position(event, &x, &y);
  gtk_native_get_surface_transform(native, &offsetX, &offsetY);
  graphene_point_t source{static_cast<float>(x - offsetX), static_cast<float>(y - offsetY)}, point;
  if (!gtk_widget_compute_point(GTK_WIDGET(native), widget, &source, &point)) return FALSE;
  auto *target = gtk_widget_pick(widget, point.x, point.y, GTK_PICK_DEFAULT);
  int index = -1;
  if (widget == self.switcher_) {
    while (target && gtk_widget_get_parent(target) != widget) target = gtk_widget_get_parent(target);
    int position = 0;
    for (auto *child = gtk_widget_get_first_child(widget); child; child = gtk_widget_get_next_sibling(child), position++) {
      if (child == target) index = position;
    }
  } else {
    while (target && target != widget && !GTK_IS_LIST_BOX_ROW(target)) target = gtk_widget_get_parent(target);
    if (target && GTK_IS_LIST_BOX_ROW(target)) index = gtk_list_box_row_get_index(GTK_LIST_BOX_ROW(target));
  }
  auto visible = std::find(self.children_.begin(), self.children_.end(), self.visiblePage());
  int selected = visible == self.children_.end() ? -1 : static_cast<int>(visible - self.children_.begin());
  if (type == GDK_BUTTON_PRESS) {
    self.repeatedIndex_ = index == selected ? index : -1;
  } else {
    if (index >= 0 && index == self.repeatedIndex_) self.select(index);
    self.repeatedIndex_ = -1;
  }
  return FALSE;
}

OneView *OneLinuxNavigation::visiblePage() const
{
  auto *child = gtk_stack_get_visible_child(stack_);
  return child ? ONE_VIEW(child) : nullptr;
}

void OneLinuxNavigation::insert(OneView *child, int index)
{
  applying_ = true;
  children_.insert(children_.begin() + std::min<size_t>(std::max(index, 0), children_.size()), child);
  one_view_set_flexible(child, TRUE);
  gtk_stack_add_child(stack_, GTK_WIDGET(child));
  applying_ = false;
}

void OneLinuxNavigation::remove(OneView *child)
{
  applying_ = true;
  std::erase(children_, child);
  gtk_stack_remove(stack_, GTK_WIDGET(child));
  applying_ = false;
}

void OneLinuxNavigation::update(std::shared_ptr<const OneLinuxNavigationProps> props, EventEmitter::Shared emitter)
{
  props_ = std::move(props);
  emitter_ = std::static_pointer_cast<const OneLinuxNavigationEventEmitter>(emitter);
  selection_.update(props_->selectedIndex, props_->revision, props_->acknowledgedEvent);
  gtk_label_set_text(GTK_LABEL(title_), props_->title.c_str());
  gtk_widget_set_visible(header_, props_->headerShown || props_->mode == "tabs");
  gtk_header_bar_set_title_widget(GTK_HEADER_BAR(header_), props_->mode == "tabs" ? switcher_ : title_);
  gtk_widget_set_visible(back_, props_->canGoBack);
  gtk_widget_set_visible(switcher_, props_->mode == "tabs");
  gtk_widget_set_visible(sidebar_, props_->mode == "sidebar");
}

void OneLinuxNavigation::sync()
{
  if (!props_) return;
  applying_ = true;
  auto *pages = gtk_stack_get_pages(stack_);
  bool reorder = g_list_model_get_n_items(G_LIST_MODEL(pages)) != children_.size();
  for (size_t i = 0; !reorder && i < children_.size(); ++i) {
    auto *page = GTK_STACK_PAGE(g_list_model_get_item(G_LIST_MODEL(pages), i));
    reorder = gtk_stack_page_get_child(page) != GTK_WIDGET(children_[i]);
    g_object_unref(page);
  }
  g_object_unref(pages);
  if (reorder) {
    for (auto *child : children_) g_object_ref(child);
    for (auto *child : children_) gtk_stack_remove(stack_, GTK_WIDGET(child));
    for (auto *child : children_) {
      gtk_stack_add_child(stack_, GTK_WIDGET(child));
      g_object_unref(child);
    }
  }
  for (size_t i = 0; i < children_.size(); ++i) {
    one_view_refresh_picking(children_[i]);
    auto *page = gtk_stack_get_page(stack_, GTK_WIDGET(children_[i]));
    if (i < props_->pageKeys.size()) gtk_stack_page_set_name(page, props_->pageKeys[i].c_str());
    if (i < props_->pageTitles.size()) gtk_stack_page_set_title(page, props_->pageTitles[i].c_str());
  }
  selection_.apply([&](double value) {
    int index = static_cast<int>(value);
    if (index >= 0 && index < children_.size()) gtk_stack_set_visible_child(stack_, GTK_WIDGET(children_[index]));
  });
  applying_ = false;
}

void OneLinuxNavigation::allocated()
{
  int width = gtk_widget_get_width(GTK_WIDGET(stack_));
  int height = gtk_widget_get_height(GTK_WIDGET(stack_));
  if (emitter_ && width > 0 && height > 0 && (width != width_ || height != height_)) {
    width_ = width;
    height_ = height;
    emitter_->onContentLayout(width, height);
  }
}

} // namespace facebook::react
