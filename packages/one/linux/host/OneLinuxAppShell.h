#pragma once

#include <gtk/gtk.h>
#include <folly/dynamic.h>
#include <functional>
#include <memory>
#include <string>
#include <vector>

#include "OneHostCommandPredicate.h"

namespace facebook::react {

// one command group per window, scoped to the runtime in that window.
class OneLinuxAppShell : public std::enable_shared_from_this<OneLinuxAppShell> {
 public:
  explicit OneLinuxAppShell(GtkWindow *window);
  ~OneLinuxAppShell();
  static std::string validate(const folly::dynamic &config);
  void configure(const folly::dynamic &config);
  void setListening(bool listening);
  void reset();
  std::function<void(const std::string &)> emitCommand;
  std::function<void()> openWindow;

 private:
  struct Binding {
    std::string id;
    guint key;
    GdkModifierType modifiers;
    commands::Predicate context;
    bool hasContext{false};
  };
  GMenu *menu(const folly::dynamic &items);
  void activate(const std::string &id);
  static gboolean keyPressed(GtkEventControllerKey *, guint key, guint, GdkModifierType, gpointer);
  GtkWindow *window_;
  GtkWidget *header_;
  GtkWidget *menuButton_;
  GSimpleActionGroup *actions_;
  GtkEventController *keys_;
  bool listening_{false};
  std::vector<Binding> bindings_;
};

} // namespace facebook::react
