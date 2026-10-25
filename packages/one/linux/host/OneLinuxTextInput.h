#pragma once

#include <gtk/gtk.h>

#include <react/renderer/components/iostextinput/TextInputComponentDescriptor.h>
#include <react/renderer/components/textinput/TextInputEventEmitter.h>

#include <limits>
#include <memory>
#include <string>

namespace facebook::react {

// A TextInput on a GtkText, or a GtkTextView when `multiline` is set, following the controlled protocol the Mac host
// follows: every user edit bumps an event count, reports it through onChange and
// writes the new text into the shadow node's state, and React's text only
// replaces the field's when the state carries the same count.
class OneLinuxTextInput {
 public:
  explicit OneLinuxTextInput(Tag tag);
  ~OneLinuxTextInput();

  // a stack holding both fields, showing the one `multiline` picks; the
  // owning view parents it and keeps it alive
  GtkWidget *widget() const
  {
    return stack_;
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
  static void changed(gpointer, gpointer data);
  static void selectionMoved(GObject *, GParamSpec *, gpointer data);
  static void insertText(GtkTextBuffer *, GtkTextIter *at, gchar *text, gint length, gpointer data);
  static void insertEditable(GtkEditable *, gchar *text, gint length, gint *at, gpointer data);
  static void markSet(GtkTextBuffer *, GtkTextIter *, GtkTextMark *, gpointer data);
  static void activated(GtkText *, gpointer data);
  static void focusEntered(GtkEventControllerFocus *, gpointer data);
  static void focusLeft(GtkEventControllerFocus *, gpointer data);
  static gboolean keyPressed(GtkEventControllerKey *, guint keyval, guint, GdkModifierType modifiers, gpointer data);

  GtkWidget *field() const
  {
    return multiline_ ? view_ : text_;
  }
  void attachControllers(GtkWidget *widget, int index);
  void setMultiline(bool multiline);
  void reportSelection();
  void selectionBounds(int &start, int &end) const;
  void updatePlaceholder();
  void submit();

  const TextInputProps &props() const;
  const TextInputEventEmitter *emitter() const;
  TextInputEventEmitter::Metrics metrics() const;
  Size contentSize() const;
  AttributedString attributedText(const std::string &text) const;
  std::string currentText() const;
  int insertionBytes(const gchar *text, int length) const;
  void setText(const std::string &text);
  void setSelection(int start, int end);
  void applyState(const TextInputShadowNode::ConcreteState &state);
  void updateStateWithCurrentText();
  void blur();

  Tag tag_;
  GtkWidget *stack_;
  GtkWidget *text_;
  GtkWidget *overlay_;
  GtkWidget *view_;
  GtkWidget *placeholder_;
  GtkTextBuffer *buffer_;
  GtkCssProvider *fontStyle_;
  GtkCssProvider *viewStyle_;
  GtkEventController *focus_[2];
  GtkEventController *key_[2];
  bool multiline_{false};
  int maxLength_{std::numeric_limits<int>::max()};
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
