#include "OneLinuxAppShell.h"

#include <unordered_map>

namespace facebook::react {
namespace {

bool text(const folly::dynamic &object, const char *key)
{
  auto *value = object.isObject() ? object.get_ptr(key) : nullptr;
  return value && value->isString() && !value->getString().empty();
}

bool keystroke(const std::string &source, guint &key, GdkModifierType &modifiers)
{
  auto rest = source;
  unsigned flags = 0;
  size_t split;
  while ((split = rest.find('-')) != std::string::npos && split > 0) {
    auto modifier = rest.substr(0, split);
    if (modifier == "ctrl") flags |= GDK_CONTROL_MASK;
    else if (modifier == "shift") flags |= GDK_SHIFT_MASK;
    else if (modifier == "alt") flags |= GDK_ALT_MASK;
    // cmd is the platform's primary accelerator, which is ctrl on Linux
    else if (modifier == "cmd") flags |= GDK_CONTROL_MASK;
    else return false;
    rest.erase(0, split + 1);
  }
  static const std::unordered_map<std::string, const char *> names = {
      {"enter", "Return"}, {"escape", "Escape"}, {"tab", "Tab"}, {"space", "space"},
      {"up", "Up"}, {"down", "Down"}, {"left", "Left"}, {"right", "Right"},
      {"backspace", "BackSpace"}, {"delete", "Delete"}, {"home", "Home"}, {"end", "End"},
      {"pageup", "Page_Up"}, {"pagedown", "Page_Down"}};
  auto found = names.find(rest);
  if (found != names.end()) rest = found->second;
  if (rest.size() > 1 && rest[0] == 'f') rest[0] = 'F';
  key = gdk_keyval_from_name(rest.c_str());
  if (key == GDK_KEY_VoidSymbol && g_utf8_validate(rest.c_str(), -1, nullptr) && g_utf8_strlen(rest.c_str(), -1) == 1) {
    key = gdk_unicode_to_keyval(g_utf8_get_char(rest.c_str()));
  }
  modifiers = static_cast<GdkModifierType>(flags);
  return key != GDK_KEY_VoidSymbol && key != 0;
}

// gtk reads an underscore in a menu label as a mnemonic marker
std::string label(const folly::dynamic &item)
{
  std::string result;
  for (char c : item["label"].getString()) {
    if (c == '_') result += '_';
    result += c;
  }
  return result;
}

std::string checkItems(const folly::dynamic &items)
{
  if (!items.isArray()) return "menu items must be an array";
  for (const auto &item : items) {
    if (!text(item, "kind")) return "menu item needs a kind";
    auto kind = item["kind"].getString();
    if (kind == "separator") continue;
    if (!text(item, "label")) return "menu item needs a label";
    if (kind == "action") {
      if (!text(item, "id")) return "menu action needs an id";
    } else if (kind == "submenu") {
      auto *children = item.get_ptr("items");
      auto error = children ? checkItems(*children) : "submenu needs items";
      if (!error.empty()) return error;
    } else return "unsupported menu item kind";
  }
  return {};
}

} // namespace

OneLinuxAppShell::OneLinuxAppShell(GtkWindow *window) : window_(window)
{
  header_ = gtk_header_bar_new();
  gtk_window_set_titlebar(window_, header_);
  menuButton_ = gtk_menu_button_new();
  gtk_menu_button_set_icon_name(GTK_MENU_BUTTON(menuButton_), "open-menu-symbolic");
  gtk_widget_set_tooltip_text(menuButton_, "Main menu");
  gtk_header_bar_pack_end(GTK_HEADER_BAR(header_), menuButton_);
  actions_ = g_simple_action_group_new();
  gtk_widget_insert_action_group(GTK_WIDGET(window_), "one", G_ACTION_GROUP(actions_));
  keys_ = gtk_event_controller_key_new();
  gtk_event_controller_set_propagation_phase(keys_, GTK_PHASE_CAPTURE);
  g_signal_connect(keys_, "key-pressed", G_CALLBACK(keyPressed), this);
  gtk_widget_add_controller(GTK_WIDGET(window_), keys_);
  reset();
}

OneLinuxAppShell::~OneLinuxAppShell()
{
  g_signal_handlers_disconnect_by_data(keys_, this);
  gtk_widget_remove_controller(GTK_WIDGET(window_), keys_);
  gtk_widget_insert_action_group(GTK_WIDGET(window_), "one", nullptr);
  g_object_unref(actions_);
}

std::string OneLinuxAppShell::validate(const folly::dynamic &config)
{
  if (!config.isObject()) return "expected a config object";
  auto *menus = config.get_ptr("menus");
  auto *bindings = config.get_ptr("bindings");
  if (!menus || !menus->isArray() || !bindings || !bindings->isArray()) return "menus and bindings must be arrays";
  for (const auto &entry : *menus) {
    if (!text(entry, "label")) return "menu needs a label";
    auto *items = entry.get_ptr("items");
    auto error = items ? checkItems(*items) : "menu needs items";
    if (!error.empty()) return error;
  }
  for (const auto &entry : *bindings) {
    if (!text(entry, "id") || !text(entry, "key")) return "binding needs an id and key";
    guint key;
    GdkModifierType modifiers;
    if (!keystroke(entry["key"].getString(), key, modifiers)) return "unsupported keystroke";
    auto *context = entry.get_ptr("context");
    if (context && !context->isNull()) {
      if (!context->isString()) return "context must be a string or null";
      commands::Predicate predicate;
      std::string error;
      if (!commands::PredicateParser(context->getString()).parse(predicate, error)) return error;
    }
  }
  if (config.get_ptr("toolbar")) return "toolbar configuration is not yet supported on Linux";
  return {};
}

void OneLinuxAppShell::activate(const std::string &id)
{
  if (listening_ && emitCommand) emitCommand(id);
}

GMenu *OneLinuxAppShell::menu(const folly::dynamic &items)
{
  GMenu *result = g_menu_new();
  GMenu *section = g_menu_new();
  auto flush = [&] {
    if (g_menu_model_get_n_items(G_MENU_MODEL(section))) g_menu_append_section(result, nullptr, G_MENU_MODEL(section));
    g_object_unref(section);
    section = g_menu_new();
  };
  for (const auto &item : items) {
    auto kind = item["kind"].getString();
    if (kind == "separator") { flush(); continue; }
    if (kind == "submenu") {
      auto *child = menu(item["items"]);
      g_menu_append_submenu(section, label(item).c_str(), G_MENU_MODEL(child));
      g_object_unref(child);
    } else {
      auto id = item["id"].getString();
      // action names are generated so application ids retain their exact bytes.
      gchar *uuid = g_uuid_string_random();
      auto name = std::string("command-") + uuid;
      g_free(uuid);
      auto *action = g_simple_action_new(name.c_str(), nullptr);
      g_simple_action_set_enabled(action, listening_);
      g_object_set_data_full(G_OBJECT(action), "command-id", g_strdup(id.c_str()), g_free);
      g_signal_connect(action, "activate", G_CALLBACK(+[](GSimpleAction *action, GVariant *, gpointer data) {
        static_cast<OneLinuxAppShell *>(data)->activate(static_cast<const char *>(g_object_get_data(G_OBJECT(action), "command-id")));
      }), this);
      g_action_map_add_action(G_ACTION_MAP(actions_), G_ACTION(action));
      g_menu_append(section, label(item).c_str(), ("one." + name).c_str());
      g_object_unref(action);
    }
  }
  flush();
  g_object_unref(section);
  return result;
}

void OneLinuxAppShell::reset()
{
  listening_ = false;
  configure(folly::dynamic::object("menus", folly::dynamic::array())("bindings", folly::dynamic::array()));
}

void OneLinuxAppShell::configure(const folly::dynamic &config)
{
  gchar **names = g_action_group_list_actions(G_ACTION_GROUP(actions_));
  for (char **name = names; *name; ++name) g_action_map_remove_action(G_ACTION_MAP(actions_), *name);
  g_strfreev(names);
  bindings_.clear();
  for (const auto &entry : config["bindings"]) {
    Binding binding;
    binding.id = entry["id"].getString();
    keystroke(entry["key"].getString(), binding.key, binding.modifiers);
    if (auto *context = entry.get_ptr("context"); context && context->isString()) {
      std::string error;
      binding.hasContext = true;
      commands::PredicateParser(context->getString()).parse(binding.context, error);
    }
    bindings_.push_back(std::move(binding));
  }
  auto *model = g_menu_new();
  for (const auto &entry : config["menus"]) {
    auto *child = menu(entry["items"]);
    g_menu_append_submenu(model, label(entry).c_str(), G_MENU_MODEL(child));
    g_object_unref(child);
  }
  auto *newWindow = g_simple_action_new("new-window", nullptr);
  g_signal_connect(newWindow, "activate", G_CALLBACK(+[](GSimpleAction *, GVariant *, gpointer data) {
    auto &shell = *static_cast<OneLinuxAppShell *>(data);
    if (shell.openWindow) shell.openWindow();
  }), this);
  g_action_map_add_action(G_ACTION_MAP(actions_), G_ACTION(newWindow));
  g_object_unref(newWindow);
  g_menu_append(model, "New Window", "one.new-window");
  gtk_menu_button_set_menu_model(GTK_MENU_BUTTON(menuButton_), G_MENU_MODEL(model));
  g_object_unref(model);
}

void OneLinuxAppShell::setListening(bool listening)
{
  listening_ = listening;
  gchar **names = g_action_group_list_actions(G_ACTION_GROUP(actions_));
  for (char **name = names; *name; ++name) {
    auto *action = g_action_map_lookup_action(G_ACTION_MAP(actions_), *name);
    g_simple_action_set_enabled(G_SIMPLE_ACTION(action), listening || std::string(*name) == "new-window");
  }
  g_strfreev(names);
}

// shift-[ arrives as braceleft with shift consumed, while the binding names the
// physical key: bracketleft with shift held. match that against the key's
// base symbol in the event's layout.
static bool matchesBaseKey(GdkEvent *event, guint key, GdkModifierType modifiers)
{
  constexpr unsigned mask = GDK_SHIFT_MASK | GDK_CONTROL_MASK | GDK_ALT_MASK | GDK_SUPER_MASK;
  if ((gdk_event_get_modifier_state(event) & mask) != modifiers) return false;
  GdkKeymapKey *keys;
  guint *keyvals;
  int count;
  bool matched = false;
  if (gdk_display_map_keycode(gdk_event_get_display(event), gdk_key_event_get_keycode(event), &keys, &keyvals, &count)) {
    for (int i = 0; i < count; i++) {
      if (keys[i].group == static_cast<int>(gdk_key_event_get_layout(event)) && keys[i].level == 0 &&
          gdk_keyval_to_lower(keyvals[i]) == gdk_keyval_to_lower(key)) matched = true;
    }
    g_free(keys);
    g_free(keyvals);
  }
  return matched;
}

gboolean OneLinuxAppShell::keyPressed(GtkEventControllerKey *controller, guint, guint, GdkModifierType, gpointer data)
{
  auto &shell = *static_cast<OneLinuxAppShell *>(data);
  if (!shell.listening_) return FALSE;
  auto *focus = gtk_window_get_focus(shell.window_);
  bool input = focus && (GTK_IS_EDITABLE(focus) || GTK_IS_TEXT_VIEW(focus));
  auto *event = gtk_event_controller_get_current_event(GTK_EVENT_CONTROLLER(controller));
  for (const auto &binding : shell.bindings_) {
    // gdk resolves shifted symbols and layouts, so cmd-shift-[ and ctrl-+ match
    if ((gdk_key_event_matches(event, binding.key, binding.modifiers) == GDK_KEY_MATCH_EXACT ||
         matchesBaseKey(event, binding.key, binding.modifiers)) &&
        (!binding.hasContext || binding.context.matches(input))) {
      shell.activate(binding.id);
      return TRUE;
    }
  }
  return FALSE;
}

} // namespace facebook::react
