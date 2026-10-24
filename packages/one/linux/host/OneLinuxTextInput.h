#pragma once

#include <gtk/gtk.h>

#include <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/textinput/TextInputEventEmitter.h>

#include <memory>
#include <string>

namespace facebook::react {

// A TextInput on a GtkText, following the controlled protocol the Mac host
// follows: every user edit bumps an event count, reports it through onChange and
// writes the new text into the shadow node's state, and React's text only
// replaces the field's when the state carries the same count.
class OneLinuxTextInput {
 public:
  explicit OneLinuxTextInput(Tag tag);
  ~OneLinuxTextInput();

  // the field; the owning view parents it and keeps it alive
  GtkWidget *widget() const
  {
    return text_;
  }

  // props, emitter, state and size are the mounted ones; safe to call on every restyle
  void update(
      Props::Shared props,
      std::shared_ptr<const EventEmitter> eventEmitter,
      std::shared_ptr<const TextInputShadowNode::ConcreteState> state,
      Size size);

  // focus, blur and setTextAndSelection
  void command(const std::string &name, const folly::dynamic &args);

 private:
  static void changed(GtkEditable *, gpointer data);
  static void selectionMoved(GObject *, GParamSpec *, gpointer data);
  static void activated(GtkText *, gpointer data);
  static void focusEntered(GtkEventControllerFocus *, gpointer data);
  static void focusLeft(GtkEventControllerFocus *, gpointer data);
  static gboolean keyPressed(GtkEventControllerKey *, guint keyval, guint, GdkModifierType modifiers, gpointer data);

  const TextInputProps &props() const;
  const TextInputEventEmitter *emitter() const;
  TextInputEventEmitter::Metrics metrics() const;
  Size contentSize() const;
  AttributedString attributedText(const std::string &text) const;
  std::string currentText() const;
  void setText(const std::string &text);
  void setSelection(int start, int end);
  void applyState(const TextInputShadowNode::ConcreteState &state);
  void updateStateWithCurrentText();
  void blur();

  Tag tag_;
  GtkWidget *text_;
  GtkEventController *focus_;
  GtkEventController *key_;
  std::shared_ptr<const EventEmitter> eventEmitter_;
  std::shared_ptr<const TextInputShadowNode::ConcreteState> state_;
  Props::Shared props_;
  Size size_{};
  Size lastContentSize_{};
  AttributedString::Range lastSelection_{};
  int64_t mostRecentEventCount_{0};
  bool comingFromJS_{false};
  bool didAutoFocus_{false};
};

} // namespace facebook::react
