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

void OneLinuxTextInput::attachControllers(GtkWidget *widget, int index)
{
  focus_[index] = gtk_event_controller_focus_new();
  g_signal_connect(focus_[index], "enter", G_CALLBACK(focusEntered), this);
  g_signal_connect(focus_[index], "leave", G_CALLBACK(focusLeft), this);
  gtk_widget_add_controller(widget, focus_[index]);

  key_[index] = gtk_event_controller_key_new();
  gtk_event_controller_set_propagation_phase(key_[index], GTK_PHASE_CAPTURE);
  g_signal_connect(key_[index], "key-pressed", G_CALLBACK(keyPressed), this);
  gtk_widget_add_controller(widget, key_[index]);
}

OneLinuxTextInput::OneLinuxTextInput(Tag tag) : tag_(tag)
{
  stack_ = gtk_stack_new();
  g_object_ref_sink(stack_);
  // only the visible field counts toward the input's size
  gtk_stack_set_hhomogeneous(GTK_STACK(stack_), FALSE);
  gtk_stack_set_vhomogeneous(GTK_STACK(stack_), FALSE);

  text_ = gtk_text_new();
  fontStyle_ = gtk_css_provider_new();
  G_GNUC_BEGIN_IGNORE_DEPRECATIONS
  gtk_style_context_add_provider(gtk_widget_get_style_context(text_), GTK_STYLE_PROVIDER(fontStyle_), GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
  G_GNUC_END_IGNORE_DEPRECATIONS
  // the field takes whatever width its view gives it
  gtk_editable_set_width_chars(GTK_EDITABLE(text_), 1);
  g_signal_connect(text_, "changed", G_CALLBACK(changed), this);
  g_signal_connect(text_, "notify::cursor-position", G_CALLBACK(selectionMoved), this);
  g_signal_connect(text_, "notify::selection-bound", G_CALLBACK(selectionMoved), this);
  g_signal_connect(text_, "activate", G_CALLBACK(activated), this);
  attachControllers(text_, 0);
  gtk_stack_add_named(GTK_STACK(stack_), text_, "single");

  // a GtkTextView has no placeholder, so a label over it stands in
  view_ = gtk_text_view_new();
  buffer_ = gtk_text_view_get_buffer(GTK_TEXT_VIEW(view_));
  gtk_text_view_set_wrap_mode(GTK_TEXT_VIEW(view_), GTK_WRAP_WORD_CHAR);
  GtkWidget *scroll = gtk_scrolled_window_new();
  gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(scroll), GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);
  gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll), view_);
  overlay_ = gtk_overlay_new();
  gtk_overlay_set_child(GTK_OVERLAY(overlay_), scroll);
  placeholder_ = gtk_label_new("");
  gtk_widget_set_halign(placeholder_, GTK_ALIGN_START);
  gtk_widget_set_valign(placeholder_, GTK_ALIGN_START);
  gtk_widget_set_can_target(placeholder_, FALSE);
  gtk_overlay_add_overlay(GTK_OVERLAY(overlay_), placeholder_);
  viewStyle_ = gtk_css_provider_new();
  G_GNUC_BEGIN_IGNORE_DEPRECATIONS
  gtk_style_context_add_provider(gtk_widget_get_style_context(view_), GTK_STYLE_PROVIDER(viewStyle_), GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
  gtk_style_context_add_provider(gtk_widget_get_style_context(placeholder_), GTK_STYLE_PROVIDER(viewStyle_), GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
  G_GNUC_END_IGNORE_DEPRECATIONS
  g_signal_connect(buffer_, "changed", G_CALLBACK(changed), this);
  g_signal_connect(buffer_, "insert-text", G_CALLBACK(insertText), this);
  g_signal_connect(buffer_, "mark-set", G_CALLBACK(markSet), this);
  attachControllers(view_, 1);
  gtk_stack_add_named(GTK_STACK(stack_), overlay_, "multi");

  gtk_stack_set_visible_child(GTK_STACK(stack_), text_);
}

OneLinuxTextInput::~OneLinuxTextInput()
{
  g_signal_handlers_disconnect_by_data(text_, this);
  g_signal_handlers_disconnect_by_data(buffer_, this);
  for (int i = 0; i < 2; i++) {
    g_signal_handlers_disconnect_by_data(focus_[i], this);
    g_signal_handlers_disconnect_by_data(key_[i], this);
  }
  g_object_unref(fontStyle_);
  g_object_unref(viewStyle_);
  g_object_unref(stack_);
}

void OneLinuxTextInput::setMultiline(bool multiline)
{
  if (multiline == multiline_) {
    return;
  }
  // the text carries over so a field that switches keeps what was typed
  std::string text = currentText();
  multiline_ = multiline;
  comingFromJS_ = true;
  if (multiline_) {
    gtk_text_buffer_set_text(buffer_, text.c_str(), -1);
  } else {
    gtk_editable_set_text(GTK_EDITABLE(text_), text.c_str());
  }
  comingFromJS_ = false;
  gtk_stack_set_visible_child(GTK_STACK(stack_), multiline_ ? overlay_ : text_);
  updatePlaceholder();
}

void OneLinuxTextInput::updatePlaceholder()
{
  gtk_widget_set_visible(placeholder_, multiline_ && gtk_text_buffer_get_char_count(buffer_) == 0);
}

// the selection as character offsets; an empty one is the caret
void OneLinuxTextInput::selectionBounds(int &start, int &end) const
{
  if (multiline_) {
    GtkTextIter first, last;
    if (gtk_text_buffer_get_selection_bounds(buffer_, &first, &last)) {
      start = gtk_text_iter_get_offset(&first);
      end = gtk_text_iter_get_offset(&last);
    } else {
      start = end = gtk_text_iter_get_offset(&first);
    }
    return;
  }
  gtk_editable_get_selection_bounds(GTK_EDITABLE(text_), &start, &end);
  if (start == end) {
    start = end = gtk_editable_get_position(GTK_EDITABLE(text_));
  }
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
  if (!multiline_) {
    return gtk_editable_get_text(GTK_EDITABLE(text_));
  }
  GtkTextIter start, end;
  gtk_text_buffer_get_bounds(buffer_, &start, &end);
  gchar *text = gtk_text_buffer_get_text(buffer_, &start, &end, FALSE);
  std::string result = text;
  g_free(text);
  return result;
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
  PangoLayout *layout = OneLinuxCreateLayout(attributedText(currentText()), ParagraphAttributes{}, multiline_ ? size_.width : -1, false);
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
  selectionBounds(start, end);
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
  int position, unused;
  selectionBounds(position, unused);
  int length = g_utf8_strlen(text.c_str(), -1);
  comingFromJS_ = true;
  if (multiline_) {
    gtk_text_buffer_set_text(buffer_, text.c_str(), -1);
    GtkTextIter caret;
    gtk_text_buffer_get_iter_at_offset(buffer_, &caret, std::min(position, length));
    gtk_text_buffer_place_cursor(buffer_, &caret);
  } else {
    gtk_editable_set_text(GTK_EDITABLE(text_), text.c_str());
    gtk_editable_set_position(GTK_EDITABLE(text_), std::min(position, length));
  }
  comingFromJS_ = false;
  updatePlaceholder();
}

void OneLinuxTextInput::setSelection(int start, int end)
{
  std::string text = currentText();
  comingFromJS_ = true;
  if (multiline_) {
    GtkTextIter first, last;
    gtk_text_buffer_get_iter_at_offset(buffer_, &first, characterOffset(text, start));
    gtk_text_buffer_get_iter_at_offset(buffer_, &last, characterOffset(text, end));
    gtk_text_buffer_select_range(buffer_, &last, &first);
  } else {
    gtk_editable_select_region(GTK_EDITABLE(text_), characterOffset(text, start), characterOffset(text, end));
  }
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
    setMultiline(textProps.multiline);
    GtkEditable *editable = GTK_EDITABLE(text_);
    gtk_editable_set_editable(editable, textProps.traits.editable && !textProps.readOnly);
    gtk_text_set_visibility(GTK_TEXT(text_), !textProps.traits.secureTextEntry);
    maxLength_ = textProps.maxLength == std::numeric_limits<int>::max() ? 0 : std::max(textProps.maxLength, 0);
    gtk_text_set_max_length(GTK_TEXT(text_), maxLength_);
    gtk_text_set_placeholder_text(GTK_TEXT(text_), textProps.placeholder.empty() ? nullptr : textProps.placeholder.c_str());

    auto attributes = textProps.getEffectiveTextAttributes(1);
    gtk_css_provider_load_from_string(fontStyle_, OneLinuxCreateFieldFontCss(attributes).c_str());
    PangoAttrList *list = OneLinuxCreateFieldAttributes(attributes);
    gtk_text_set_attributes(GTK_TEXT(text_), list);
    pango_attr_list_unref(list);
    float alignment = 0;
    if (attributes.alignment) {
      alignment = *attributes.alignment == TextAlignment::Center ? 0.5f : *attributes.alignment == TextAlignment::Right ? 1.0f : 0.0f;
    }
    gtk_editable_set_alignment(editable, alignment);

    // the multiline field takes its font and color from CSS, and reads the
    // placeholder from its label; the buffer enforces maxLength
    gtk_text_view_set_editable(GTK_TEXT_VIEW(view_), textProps.traits.editable && !textProps.readOnly);
    gtk_text_view_set_justification(
        GTK_TEXT_VIEW(view_), alignment == 0.5f ? GTK_JUSTIFY_CENTER : alignment == 1.0f ? GTK_JUSTIFY_RIGHT : GTK_JUSTIFY_LEFT);
    gtk_widget_set_halign(placeholder_, alignment == 0.5f ? GTK_ALIGN_CENTER : alignment == 1.0f ? GTK_ALIGN_END : GTK_ALIGN_START);
    gtk_label_set_text(GTK_LABEL(placeholder_), textProps.placeholder.c_str());
    std::string css = OneLinuxCreateFieldFontCss(attributes, "textview, textview text") + OneLinuxCreateFieldFontCss(attributes, "label") +
        OneLinuxCreateFieldColorCss(attributes, "textview text") + "label { opacity: 0.5; }";
    gtk_css_provider_load_from_string(viewStyle_, css.c_str());
    updatePlaceholder();
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
    auto *idle = new FocusIdle{GTK_WIDGET(g_object_ref(field()))};
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
  if (gtk_widget_has_focus(field())) {
    if (GtkRoot *root = gtk_widget_get_root(field())) {
      gtk_root_set_focus(root, nullptr);
    }
  }
}

void OneLinuxTextInput::command(const std::string &name, const folly::dynamic &args)
{
  if (name == "focus") {
    gtk_widget_grab_focus(field());
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

// keeps an insert inside maxLength: the part that fits goes in instead
void OneLinuxTextInput::insertText(GtkTextBuffer *buffer, GtkTextIter *at, gchar *text, gint length, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (self.maxLength_ <= 0) {
    return;
  }
  int room = self.maxLength_ - gtk_text_buffer_get_char_count(buffer);
  long incoming = g_utf8_strlen(text, length);
  if (incoming <= room) {
    return;
  }
  g_signal_stop_emission_by_name(buffer, "insert-text");
  if (room > 0) {
    const char *end = g_utf8_offset_to_pointer(text, room);
    g_signal_handlers_block_by_func(buffer, reinterpret_cast<gpointer>(insertText), data);
    gtk_text_buffer_insert(buffer, at, text, static_cast<gint>(end - text));
    g_signal_handlers_unblock_by_func(buffer, reinterpret_cast<gpointer>(insertText), data);
  }
}

// edits that originate in the field bump the event count and tell React; the
// state carries the new text so the shadow node measures what is on screen
void OneLinuxTextInput::changed(gpointer, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  self.updatePlaceholder();
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

void OneLinuxTextInput::reportSelection()
{
  if (comingFromJS_ || !props_) {
    return;
  }
  auto metrics = this->metrics();
  if (metrics.selectionRange.location == lastSelection_.location && metrics.selectionRange.length == lastSelection_.length) {
    return;
  }
  lastSelection_ = metrics.selectionRange;
  if (auto *emitter = this->emitter()) {
    emitter->onSelectionChange(metrics);
  }
}

void OneLinuxTextInput::selectionMoved(GObject *, GParamSpec *, gpointer data)
{
  static_cast<OneLinuxTextInput *>(data)->reportSelection();
}

void OneLinuxTextInput::markSet(GtkTextBuffer *, GtkTextIter *, GtkTextMark *, gpointer data)
{
  static_cast<OneLinuxTextInput *>(data)->reportSelection();
}

void OneLinuxTextInput::submit()
{
  if (!props_) {
    return;
  }
  if (auto *emitter = this->emitter()) {
    emitter->onSubmitEditing(metrics());
  }
  if (props().submitBehavior == SubmitBehavior::BlurAndSubmit) {
    blur();
  }
}

void OneLinuxTextInput::activated(GtkText *, gpointer data)
{
  auto &self = *static_cast<OneLinuxTextInput *>(data);
  if (self.props_ && self.props().submitBehavior != SubmitBehavior::Newline) {
    self.submit();
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
  // Enter in a multiline field adds a line unless the input submits on it;
  // shift+Enter always adds one
  if (self.multiline_ && key == "Enter" && !(modifiers & GDK_SHIFT_MASK) && self.props().submitBehavior != SubmitBehavior::Newline) {
    self.submit();
    return TRUE;
  }
  return FALSE;
}

} // namespace facebook::react
