#include "OneLinuxTextInput.h"

#include <algorithm>
#include <cmath>
#include <limits>

#include "OneLinuxText.h"

namespace facebook::react {

namespace {

// react counts text in utf16 units and gtk in characters
int utf16Offset(const std::string &text, int characters)
{
  const gchar *end = g_utf8_offset_to_pointer(text.c_str(), characters);
  int units = 0;
  for (const gchar *p = text.c_str(); p < end; p = g_utf8_next_char(p)) {
    units += g_utf8_get_char(p) > 0xFFFF ? 2 : 1;
  }
  return units;
}

int characterOffset(const std::string &text, int units)
{
  int characters = 0;
  int counted = 0;
  for (const gchar *p = text.c_str(); *p && counted < units; p = g_utf8_next_char(p)) {
    counted += g_utf8_get_char(p) > 0xFFFF ? 2 : 1;
    characters += 1;
  }
  return characters;
}

} // namespace

struct FocusIdle {
  GtkWidget *widget;
};

OneLinuxTextInput::OneLinuxTextInput(Tag tag) : tag_(tag)
{
  text_ = gtk_text_new();
  g_object_ref_sink(text_);
  // the field takes whatever width its view gives it
  gtk_editable_set_width_chars(GTK_EDITABLE(text_), 1);
  g_signal_connect(text_, "changed", G_CALLBACK(changed), this);
  g_signal_connect(text_, "notify::cursor-position", G_CALLBACK(selectionMoved), this);
  g_signal_connect(text_, "notify::selection-bound", G_CALLBACK(selectionMoved), this);
  g_signal_connect(text_, "activate", G_CALLBACK(activated), this);

  focus_ = gtk_event_controller_focus_new();
  g_signal_connect(focus_, "enter", G_CALLBACK(focusEntered), this);
  g_signal_connect(focus_, "leave", G_CALLBACK(focusLeft), this);
  gtk_widget_add_controller(text_, focus_);

  key_ = gtk_event_controller_key_new();
  gtk_event_controller_set_propagation_phase(key_, GTK_PHASE_CAPTURE);
  g_signal_connect(key_, "key-pressed", G_CALLBACK(keyPressed), this);
  gtk_widget_add_controller(text_, key_);
}

OneLinuxTextInput::~OneLinuxTextInput()
{
  g_signal_handlers_disconnect_by_data(text_, this);
  g_signal_handlers_disconnect_by_data(focus_, this);
  g_signal_handlers_disconnect_by_data(key_, this);
  g_object_unref(text_);
}

const TextInputProps &OneLinuxTextInput::props() const
{
  return static_cast<const TextInputProps &>(*props_);
}

const TextInputEventEmitter *OneLinuxTextInput::emitter() const
{
  return static_cast<const TextInputEventEmitter *>(eventEmitter_.get());
}

std::string OneLinuxTextInput::currentText() const
{
  return gtk_editable_get_text(GTK_EDITABLE(text_));
}

AttributedString OneLinuxTextInput::attributedText(const std::string &text) const
{
  auto attributes = props().getEffectiveTextAttributes(1);
  AttributedString result;
  result.setBaseTextAttributes(attributes);
  result.appendFragment({.string = text, .textAttributes = attributes, .parentShadowView = {}});
  return result;
}

Size OneLinuxTextInput::contentSize() const
{
  PangoLayout *layout = OneLinuxCreateLayout(attributedText(currentText()), ParagraphAttributes{}, -1, false);
  int width, height;
  pango_layout_get_pixel_size(layout, &width, &height);
  g_object_unref(layout);
  return {static_cast<Float>(width), static_cast<Float>(height)};
}

TextInputEventEmitter::Metrics OneLinuxTextInput::metrics() const
{
  TextInputEventEmitter::Metrics result;
  result.text = currentText();
  int start, end;
  gtk_editable_get_selection_bounds(GTK_EDITABLE(text_), &start, &end);
  if (start == end) {
    start = end = gtk_editable_get_position(GTK_EDITABLE(text_));
  }
  int first = utf16Offset(result.text, start);
  result.selectionRange = {first, utf16Offset(result.text, end) - first};
  result.contentSize = contentSize();
  result.containerSize = size_;
  result.layoutMeasurement = size_;
  result.eventCount = static_cast<int>(mostRecentEventCount_);
  result.zoomScale = 1;
  result.target = tag_;
  return result;
}

void OneLinuxTextInput::setText(const std::string &text)
{
  if (currentText() == text) {
    return;
  }
  int position = gtk_editable_get_position(GTK_EDITABLE(text_));
  comingFromJS_ = true;
  gtk_editable_set_text(GTK_EDITABLE(text_), text.c_str());
  gtk_editable_set_position(GTK_EDITABLE(text_), std::min<int>(position, g_utf8_strlen(text.c_str(), -1)));
  comingFromJS_ = false;
}

void OneLinuxTextInput::setSelection(int start, int end)
{
  std::string text = currentText();
  comingFromJS_ = true;
  gtk_editable_select_region(GTK_EDITABLE(text_), characterOffset(text, start), characterOffset(text, end));
  comingFromJS_ = false;
}

void OneLinuxTextInput::updateStateWithCurrentText()
{
  if (!state_) {
    return;
  }
  auto data = state_->getData();
  const auto &base = data.reactTreeAttributedString.getBaseTextAttributes();
  ShadowView parent;
  const auto &fragments = data.reactTreeAttributedString.getFragments();
  if (!fragments.empty()) {
    parent = fragments.front().parentShadowView;
  }
  AttributedString text;
  text.setBaseTextAttributes(base);
  text.appendFragment({.string = currentText(), .textAttributes = base, .parentShadowView = parent});
  state_->updateState(TextInputState{AttributedStringBox{text}, data.reactTreeAttributedString, data.paragraphAttributes, mostRecentEventCount_});
}

void OneLinuxTextInput::applyState(const TextInputShadowNode::ConcreteState &state)
{
  const auto &data = state.getData();
  if (mostRecentEventCount_ != data.mostRecentEventCount) {
    return;
  }
  if (data.attributedStringBox.getMode() == AttributedStringBox::Mode::Value) {
    std::string text;
    for (const auto &fragment : data.attributedStringBox.getValue().getFragments()) {
      text += fragment.string;
    }
    setText(text);
  }
}

void OneLinuxTextInput::update(
    Props::Shared props,
    std::shared_ptr<const EventEmitter> eventEmitter,
    std::shared_ptr<const TextInputShadowNode::ConcreteState> state,
    Size size)
{
  bool propsChanged = props_ != props;
  props_ = std::move(props);
  eventEmitter_ = std::move(eventEmitter);
  size_ = size;
  if (!props_) {
    return;
  }
  const auto &textProps = this->props();

  if (propsChanged) {
    GtkEditable *editable = GTK_EDITABLE(text_);
    gtk_editable_set_editable(editable, textProps.traits.editable && !textProps.readOnly);
    gtk_text_set_visibility(GTK_TEXT(text_), !textProps.traits.secureTextEntry);
    gtk_text_set_max_length(GTK_TEXT(text_), textProps.maxLength == std::numeric_limits<int>::max() ? 0 : std::max(textProps.maxLength, 0));
    gtk_text_set_placeholder_text(GTK_TEXT(text_), textProps.placeholder.empty() ? nullptr : textProps.placeholder.c_str());

    auto attributes = textProps.getEffectiveTextAttributes(1);
    PangoAttrList *list = OneLinuxCreateFieldAttributes(attributes);
    gtk_text_set_attributes(GTK_TEXT(text_), list);
    pango_attr_list_unref(list);
    float alignment = 0;
    if (attributes.alignment) {
      alignment = *attributes.alignment == TextAlignment::Center ? 0.5f : *attributes.alignment == TextAlignment::Right ? 1.0f : 0.0f;
    }
    gtk_editable_set_alignment(editable, alignment);
  }

  if (state && state != state_) {
    state_ = std::move(state);
    applyState(*state_);
  }

  if (propsChanged && textProps.selection) {
    setSelection(std::max(textProps.selection->start, 0), std::max(textProps.selection->end, textProps.selection->start));
  }

  if (!didAutoFocus_ && textProps.autoFocus) {
    didAutoFocus_ = true;
    auto *idle = new FocusIdle{GTK_WIDGET(g_object_ref(text_))};
    g_idle_add(
        [](gpointer data) -> gboolean {
          auto *focus = static_cast<FocusIdle *>(data);
          gtk_widget_grab_focus(focus->widget);
          g_object_unref(focus->widget);
          delete focus;
          return G_SOURCE_REMOVE;
        },
        idle);
  }
}

void OneLinuxTextInput::blur()
{
  if (gtk_widget_has_focus(text_)) {
    if (GtkRoot *root = gtk_widget_get_root(text_)) {
      gtk_root_set_focus(root, nullptr);
    }
  }
}

void OneLinuxTextInput::command(const std::string &name, const folly::dynamic &args)
{
  if (name == "focus") {
    gtk_widget_grab_focus(text_);
  } else if (name == "blur") {
    blur();
  } else if (name == "setTextAndSelection" && args.size() >= 4) {
    if (args[0].asInt() < mostRecentEventCount_) {
      return;
    }
    if (args[1].isString()) {
      setText(args[1].asString());
    }
    int start = static_cast<int>(args[2].asInt());
    int end = static_cast<int>(args[3].asInt());
    if (start >= 0 && end >= 0) {
      setSelection(start, std::max(end, start));
    }
  }
}

// edits that originate in the field bump the event count and tell React; the
// state carries the new text so the shadow node measures what is on screen
void OneLinuxTextInput::changed(GtkEditable *, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (self.comingFromJS_ || !self.props_) {
    return;
  }
  self.mostRecentEventCount_ += 1;
  self.updateStateWithCurrentText();
  if (auto *emitter = self.emitter()) {
    emitter->onChange(self.metrics());
    Size content = self.contentSize();
    if (content != self.lastContentSize_) {
      self.lastContentSize_ = content;
      emitter->onContentSizeChange(self.metrics());
    }
  }
}

void OneLinuxTextInput::selectionMoved(GObject *, GParamSpec *, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (self.comingFromJS_ || !self.props_) {
    return;
  }
  auto metrics = self.metrics();
  if (metrics.selectionRange.location == self.lastSelection_.location && metrics.selectionRange.length == self.lastSelection_.length) {
    return;
  }
  self.lastSelection_ = metrics.selectionRange;
  if (auto *emitter = self.emitter()) {
    emitter->onSelectionChange(metrics);
  }
}

void OneLinuxTextInput::activated(GtkText *, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (!self.props_) {
    return;
  }
  SubmitBehavior behavior = self.props().submitBehavior;
  if (behavior == SubmitBehavior::Newline) {
    return;
  }
  if (auto *emitter = self.emitter()) {
    emitter->onSubmitEditing(self.metrics());
  }
  if (behavior == SubmitBehavior::BlurAndSubmit) {
    self.blur();
  }
}

void OneLinuxTextInput::focusEntered(GtkEventControllerFocus *, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (auto *emitter = self.emitter()) {
    emitter->onFocus(self.metrics());
  }
}

void OneLinuxTextInput::focusLeft(GtkEventControllerFocus *, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (auto *emitter = self.emitter()) {
    auto metrics = self.metrics();
    emitter->onEndEditing(metrics);
    emitter->onBlur(metrics);
  }
}

gboolean OneLinuxTextInput::keyPressed(GtkEventControllerKey *, guint keyval, guint, GdkModifierType modifiers, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  auto *emitter = self.emitter();
  // shortcuts are not key presses
  if (!emitter || (modifiers & (GDK_CONTROL_MASK | GDK_ALT_MASK | GDK_SUPER_MASK))) {
    return FALSE;
  }
  std::string key;
  if (keyval == GDK_KEY_BackSpace) {
    key = "Backspace";
  } else if (keyval == GDK_KEY_Return || keyval == GDK_KEY_KP_Enter) {
    key = "Enter";
  } else if (keyval == GDK_KEY_Tab || keyval == GDK_KEY_ISO_Left_Tab) {
    key = "Tab";
  } else if (keyval == GDK_KEY_Escape) {
    key = "Escape";
  } else if (gunichar character = gdk_keyval_to_unicode(keyval)) {
    gchar buffer[8];
    key.assign(buffer, g_unichar_to_utf8(character, buffer));
  } else {
    return FALSE;
  }
  emitter->onKeyPress({key, static_cast<int>(self.mostRecentEventCount_)});
  return FALSE;
}

} // namespace facebook::react
