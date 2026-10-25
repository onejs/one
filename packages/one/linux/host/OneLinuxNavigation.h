#pragma once

#include <gtk/gtk.h>
#include <array>
#include <OneLinuxNavigationComponent.h>
#include "OneLinuxView.h"
#include "OneLinuxControlledValue.h"

namespace facebook::react {

class OneLinuxNavigation {
 public:
  explicit OneLinuxNavigation(OneView *owner);
  ~OneLinuxNavigation();
  GtkWidget *widget() const { return box_; }
  OneView *visiblePage() const;
  void insert(OneView *child, int index);
  void remove(OneView *child);
  void update(std::shared_ptr<const OneLinuxNavigationProps> props, EventEmitter::Shared emitter);
  void sync();
  // the header and sidebar sizes the pages sit inside
  OneLinuxNavigationState insets() const;

 private:
  static gboolean repeatEvent(GtkEventControllerLegacy *, GdkEvent *, gpointer);
  void select(int index);
  std::array<GtkEventController *, 2> repeatControllers_;
  int repeatedIndex_{-1};
  OneView *owner_;
  GtkWidget *box_;
  GtkWidget *row_;
  GtkWidget *header_;
  GtkWidget *title_;
  GtkWidget *back_;
  GtkStack *stack_;
  GtkWidget *switcher_;
  GtkWidget *sidebar_;
  std::vector<OneView *> children_;
  std::shared_ptr<const OneLinuxNavigationProps> props_;
  std::shared_ptr<const OneLinuxNavigationEventEmitter> emitter_;
  OneLinuxControlledValue<double> selection_;
  bool applying_{false};
};

} // namespace facebook::react
