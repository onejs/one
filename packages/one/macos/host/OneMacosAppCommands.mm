#import "OneMacosAppCommands.h"

#import <Carbon/Carbon.h>
#import <objc/runtime.h>

#include <cmath>
#include <cstring>
#include <memory>
#include <unordered_map>
#include <vector>

namespace {

// A key context predicate, as in GPUI: identifiers joined by `!`, `&&`, `||`
// and parentheses. The only identifier the Mac host sets is `Input`, while a
// text input has focus; any other name is absent and so false.
struct Predicate {
  enum class Kind { Identifier, Not, And, Or };
  Kind kind = Kind::Identifier;
  std::string name;
  std::vector<Predicate> operands;

  bool matches(bool inputFocused) const
  {
    switch (kind) {
      case Kind::Identifier:
        return inputFocused && name == "Input";
      case Kind::Not:
        return !operands[0].matches(inputFocused);
      case Kind::And:
        return operands[0].matches(inputFocused) && operands[1].matches(inputFocused);
      case Kind::Or:
        return operands[0].matches(inputFocused) || operands[1].matches(inputFocused);
    }
    return false;
  }
};

class PredicateParser {
 public:
  explicit PredicateParser(const std::string &source) : source_(source) {}

  bool parse(Predicate &out, std::string &error)
  {
    if (!parseOr(out) || (skipSpace(), index_ != source_.size())) {
      error = "unsupported context '" + source_ + "'";
      return false;
    }
    return true;
  }

 private:
  const std::string &source_;
  size_t index_ = 0;

  void skipSpace()
  {
    while (index_ < source_.size() && source_[index_] == ' ') {
      index_++;
    }
  }

  bool take(const char *token)
  {
    skipSpace();
    size_t length = strlen(token);
    if (source_.compare(index_, length, token) != 0) {
      return false;
    }
    index_ += length;
    return true;
  }

  bool parseBinary(Predicate &out, Predicate::Kind kind, const char *token, bool (PredicateParser::*operand)(Predicate &))
  {
    if (!(this->*operand)(out)) {
      return false;
    }
    while (take(token)) {
      Predicate right;
      if (!(this->*operand)(right)) {
        return false;
      }
      Predicate joined;
      joined.kind = kind;
      joined.operands = {std::move(out), std::move(right)};
      out = std::move(joined);
    }
    return true;
  }

  bool parseOr(Predicate &out) { return parseBinary(out, Predicate::Kind::Or, "||", &PredicateParser::parseAnd); }
  bool parseAnd(Predicate &out) { return parseBinary(out, Predicate::Kind::And, "&&", &PredicateParser::parseUnary); }

  bool parseUnary(Predicate &out)
  {
    // `!=` compares context values, which the Mac host does not have
    skipSpace();
    if (source_.compare(index_, 2, "!=") != 0 && take("!")) {
      Predicate operand;
      if (!parseUnary(operand)) {
        return false;
      }
      out.kind = Predicate::Kind::Not;
      out.operands = {std::move(operand)};
      return true;
    }
    if (take("(")) {
      return parseOr(out) && take(")");
    }
    size_t start = index_;
    while (index_ < source_.size() && (isalnum((unsigned char)source_[index_]) || source_[index_] == '_' || source_[index_] == '-')) {
      index_++;
    }
    if (index_ == start) {
      return false;
    }
    out.kind = Predicate::Kind::Identifier;
    out.name = source_.substr(start, index_ - start);
    return true;
  }
};

unichar namedKey(const std::string &name)
{
  static const std::unordered_map<std::string, unichar> keys = {
      {"up", NSUpArrowFunctionKey},
      {"down", NSDownArrowFunctionKey},
      {"left", NSLeftArrowFunctionKey},
      {"right", NSRightArrowFunctionKey},
      {"enter", '\r'},
      {"tab", '\t'},
      {"escape", 0x1b},
      {"space", ' '},
      {"backspace", NSBackspaceCharacter},
      {"delete", NSDeleteFunctionKey},
      {"home", NSHomeFunctionKey},
      {"end", NSEndFunctionKey},
      {"pageup", NSPageUpFunctionKey},
      {"pagedown", NSPageDownFunctionKey},
  };
  auto found = keys.find(name);
  if (found != keys.end()) {
    return found->second;
  }
  if (name.size() >= 2 && name[0] == 'f') {
    int number = atoi(name.c_str() + 1);
    if (number >= 1 && number <= 20 && name == "f" + std::to_string(number)) {
      return NSF1FunctionKey + number - 1;
    }
  }
  return 0;
}

// a GPUI keystroke such as `cmd-shift-[`, `ctrl-tab` or `up`
bool parseKeystroke(const std::string &keystroke, NSString *__strong *keyEquivalent, NSEventModifierFlags *modifiers)
{
  if (keystroke.empty() || keystroke.find(' ') != std::string::npos) {
    return false;
  }
  std::string rest = keystroke;
  std::string key;
  // `cmd--` binds the minus key
  if (rest == "-" || (rest.size() >= 2 && rest.compare(rest.size() - 2, 2, "--") == 0)) {
    key = "-";
    rest = rest.size() > 2 ? rest.substr(0, rest.size() - 2) : "";
  } else {
    size_t split = rest.rfind('-');
    key = split == std::string::npos ? rest : rest.substr(split + 1);
    rest = split == std::string::npos ? "" : rest.substr(0, split);
  }

  NSEventModifierFlags flags = 0;
  size_t start = 0;
  while (start < rest.size()) {
    size_t end = rest.find('-', start);
    std::string modifier = rest.substr(start, end == std::string::npos ? std::string::npos : end - start);
    if (modifier == "cmd") {
      flags |= NSEventModifierFlagCommand;
    } else if (modifier == "ctrl") {
      flags |= NSEventModifierFlagControl;
    } else if (modifier == "alt") {
      flags |= NSEventModifierFlagOption;
    } else if (modifier == "shift") {
      flags |= NSEventModifierFlagShift;
    } else if (modifier == "fn") {
      flags |= NSEventModifierFlagFunction;
    } else {
      return false;
    }
    if (end == std::string::npos) {
      break;
    }
    start = end + 1;
  }

  NSString *equivalent = nil;
  if (unichar named = namedKey(key)) {
    equivalent = [NSString stringWithCharacters:&named length:1];
  } else {
    NSString *character = [NSString stringWithUTF8String:key.c_str()];
    if (character.length == 0 || [character rangeOfComposedCharacterSequenceAtIndex:0].length != character.length) {
      return false;
    }
    equivalent = character.lowercaseString;
  }
  *keyEquivalent = equivalent;
  *modifiers = flags;
  return true;
}

const folly::dynamic *member(const folly::dynamic &object, const char *name)
{
  return object.isObject() ? object.get_ptr(name) : nullptr;
}

bool stringMember(const folly::dynamic &object, const char *name, std::string &out)
{
  auto *value = member(object, name);
  if (!value || !value->isString() || value->getString().empty()) {
    return false;
  }
  out = value->getString();
  return true;
}

} // namespace

// one key equivalent, or a menu action with none
@interface OneMacosAppCommandBinding : NSObject {
 @public
  std::shared_ptr<const Predicate> _context;
}
@property (nonatomic, copy) NSString *commandId;
@property (nonatomic, copy) NSString *keyEquivalent;
@property (nonatomic) NSEventModifierFlags modifiers;
@end

@implementation OneMacosAppCommandBinding
@end

@implementation OneMacosAppCommandConfig {
 @public
  folly::dynamic _menus;
  folly::dynamic _toolbar;
  NSArray<OneMacosAppCommandBinding *> *_bindings;
  NSSet<NSString *> *_commandIds;
}

- (NSSet<NSString *> *)commandIds
{
  return _commandIds;
}

@end

static bool OneMacosCheckMenuItems(const folly::dynamic &items, const std::string &path, NSMutableSet<NSString *> *ids, std::string &error)
{
  if (!items.isArray()) {
    error = path + " must be an array";
    return false;
  }
  for (size_t index = 0; index < items.size(); index++) {
    const auto &item = items[index];
    std::string itemPath = path + "[" + std::to_string(index) + "]";
    std::string kind, label, commandId;
    stringMember(item, "kind", kind);
    if (kind == "separator") {
      continue;
    }
    if (!stringMember(item, "label", label)) {
      error = itemPath + ".label must be a non-empty string";
      return false;
    }
    if (kind == "action") {
      if (!stringMember(item, "id", commandId)) {
        error = itemPath + ".id must be a non-empty string";
        return false;
      }
      [ids addObject:@(commandId.c_str())];
    } else if (kind == "submenu") {
      auto *children = member(item, "items");
      if (!children || !OneMacosCheckMenuItems(*children, itemPath + ".items", ids, error)) {
        if (!children) {
          error = itemPath + ".items must be an array";
        }
        return false;
      }
    } else {
      error = itemPath + ".kind must be action, separator or submenu";
      return false;
    }
  }
  return true;
}

OneMacosAppCommandConfig *OneMacosParseAppCommands(const folly::dynamic &config, std::string &error)
{
  auto *bindings = member(config, "bindings");
  auto *menus = member(config, "menus");
  if (!bindings || !bindings->isArray() || !menus || !menus->isArray()) {
    error = "config must have bindings and menus arrays";
    return nil;
  }

  NSMutableSet<NSString *> *ids = [NSMutableSet new];
  NSMutableArray<OneMacosAppCommandBinding *> *parsed = [NSMutableArray new];
  for (size_t index = 0; index < bindings->size(); index++) {
    const auto &binding = (*bindings)[index];
    std::string path = "bindings[" + std::to_string(index) + "]";
    std::string commandId, key;
    if (!stringMember(binding, "id", commandId) || !stringMember(binding, "key", key)) {
      error = path + " needs a non-empty id and key";
      return nil;
    }
    OneMacosAppCommandBinding *entry = [OneMacosAppCommandBinding new];
    entry.commandId = @(commandId.c_str());
    NSString *keyEquivalent = nil;
    NSEventModifierFlags modifiers = 0;
    if (!parseKeystroke(key, &keyEquivalent, &modifiers)) {
      error = path + ": unsupported key '" + key + "'";
      return nil;
    }
    entry.keyEquivalent = keyEquivalent;
    entry.modifiers = modifiers;
    auto *context = member(binding, "context");
    if (context && !context->isNull()) {
      auto predicate = std::make_shared<Predicate>();
      if (!context->isString() || !PredicateParser(context->getString()).parse(*predicate, error)) {
        error = path + ": " + (context->isString() ? error : "context must be a string");
        return nil;
      }
      entry->_context = predicate;
    }
    [ids addObject:entry.commandId];
    [parsed addObject:entry];
  }

  for (size_t index = 0; index < menus->size(); index++) {
    const auto &menu = (*menus)[index];
    std::string path = "menus[" + std::to_string(index) + "]";
    std::string label;
    if (!stringMember(menu, "label", label)) {
      error = path + ".label must be a non-empty string";
      return nil;
    }
    auto *items = member(menu, "items");
    if (!items) {
      error = path + ".items must be an array";
      return nil;
    }
    if (!OneMacosCheckMenuItems(*items, path + ".items", ids, error)) {
      return nil;
    }
  }

  auto *toolbar = member(config, "toolbar");
  if (toolbar) {
    if (!toolbar->isArray()) {
      error = "toolbar must be an array";
      return nil;
    }
    NSMutableSet<NSString *> *toolbarIds = [NSMutableSet new];
    for (size_t index = 0; index < toolbar->size(); index++) {
      const auto &item = (*toolbar)[index];
      std::string path = "toolbar[" + std::to_string(index) + "]";
      std::string kind, commandId, label, image;
      stringMember(item, "kind", kind);
      if (kind == "flexibleSpace") continue;
      if (kind != "action" || !stringMember(item, "id", commandId) ||
          !stringMember(item, "label", label) || !stringMember(item, "systemImage", image)) {
        error = path + " needs kind action, id, label and systemImage";
        return nil;
      }
      NSString *identifier = @(commandId.c_str());
      if ([toolbarIds containsObject:identifier]) {
        error = path + ".id must be unique in the toolbar";
        return nil;
      }
      [toolbarIds addObject:identifier];
      [ids addObject:identifier];
      if (auto *badge = member(item, "badge")) {
        double value = badge->isNumber() ? badge->asDouble() : -1;
        if (!std::isfinite(value) || value < 0 || std::trunc(value) != value || value > 9007199254740991.0) {
          error = path + ".badge must be a non-negative safe integer";
          return nil;
        }
      }
    }
  }

  OneMacosAppCommandConfig *result = [OneMacosAppCommandConfig new];
  result->_menus = *menus;
  result->_toolbar = toolbar ? *toolbar : folly::dynamic();
  result->_bindings = parsed;
  result->_commandIds = ids;
  return result;
}

static NSHashTable<NSView<OneMacosAppCommandTarget> *> *OneMacosAppCommandTargets()
{
  static NSHashTable *targets = [NSHashTable weakObjectsHashTable];
  return targets;
}

static BOOL OneMacosPerformControlTab(NSEvent *event);

void OneMacosRegisterAppCommandTarget(NSView<OneMacosAppCommandTarget> *view)
{
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    // AppKit posts the update after each pass of the event loop. An inactive
    // app can change its main window, and SwiftUI edits the menus it owns,
    // outside that pass, so those changes schedule one update after they settle.
    NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
    [center addObserverForName:NSApplicationDidUpdateNotification
                        object:NSApp
                         queue:nil
                    usingBlock:^(NSNotification *) {
                      OneMacosUpdateAppCommands();
                    }];
    static BOOL scheduled;
    for (NSNotificationName name in @[
           NSMenuDidAddItemNotification, NSMenuDidRemoveItemNotification, NSWindowDidBecomeKeyNotification,
           NSWindowDidBecomeMainNotification, NSWindowDidResignMainNotification, NSWindowWillCloseNotification
         ]) {
      [center addObserverForName:name
                          object:nil
                           queue:nil
                      usingBlock:^(NSNotification *) {
                        if (!scheduled) {
                          scheduled = YES;
                          dispatch_async(dispatch_get_main_queue(), ^{
                            scheduled = NO;
                            OneMacosUpdateAppCommands();
                          });
                        }
                      }];
    }
    // appkit clears a control-tab key equivalent from its menu items and
    // keeps the chord for the key view loop, so the binding's item runs here
    [NSEvent addLocalMonitorForEventsMatchingMask:NSEventMaskKeyDown
                                          handler:^NSEvent *(NSEvent *event) {
                                            return OneMacosPerformControlTab(event) ? nil : event;
                                          }];
  });
  [OneMacosAppCommandTargets() addObject:view];
}

static NSView<OneMacosAppCommandTarget> *OneMacosAppCommandTargetInWindow(NSWindow *window)
{
  for (NSView<OneMacosAppCommandTarget> *view in OneMacosAppCommandTargets()) {
    if (window && view.window == window) {
      return view;
    }
  }
  return nil;
}

@interface OneMacosWindowToolbar : NSObject <NSToolbarDelegate, NSToolbarItemValidation>
- (instancetype)initWithWindow:(NSWindow *)window;
- (void)applyConfig:(OneMacosAppCommandConfig *)config;
- (void)restoreToolbar;
@end

@implementation OneMacosWindowToolbar {
  __weak NSWindow *_window;
  NSToolbar *_toolbar;
  NSToolbar *_previousToolbar;
  OneMacosAppCommandConfig *_config;
  NSArray<NSToolbarItemIdentifier> *_identifiers;
  NSDictionary<NSString *, NSDictionary *> *_definitions;
}

- (instancetype)initWithWindow:(NSWindow *)window
{
  if (self = [super init]) {
    _window = window;
    _previousToolbar = window.toolbar;
    _toolbar = [[NSToolbar alloc] initWithIdentifier:[@"OneMacos.AppCommands." stringByAppendingString:NSUUID.UUID.UUIDString]];
    _toolbar.delegate = self;
    _toolbar.displayMode = NSToolbarDisplayModeIconOnly;
    _toolbar.allowsUserCustomization = NO;
    _toolbar.showsBaselineSeparator = NO;
  }
  return self;
}

- (NSArray<NSToolbarItemIdentifier> *)toolbarDefaultItemIdentifiers:(NSToolbar *)toolbar { return @[]; }
- (NSArray<NSToolbarItemIdentifier> *)toolbarAllowedItemIdentifiers:(NSToolbar *)toolbar { return _identifiers; }

- (NSToolbarItem *)toolbar:(NSToolbar *)toolbar itemForItemIdentifier:(NSToolbarItemIdentifier)identifier willBeInsertedIntoToolbar:(BOOL)inserted
{
  if ([identifier isEqualToString:NSToolbarFlexibleSpaceItemIdentifier]) return nil;
  NSToolbarItem *item = [[NSToolbarItem alloc] initWithItemIdentifier:identifier];
  item.target = self;
  item.action = @selector(performToolbarCommand:);
  item.bordered = YES;
  return item;
}

- (void)performToolbarCommand:(NSToolbarItem *)item
{
  NSView<OneMacosAppCommandTarget> *target = OneMacosAppCommandTargetInWindow(_window);
  NSString *commandId = _definitions[item.itemIdentifier][@"id"];
  if (commandId && [target oneMacosCanPerformAppCommand:commandId]) {
    [target oneMacosPerformAppCommand:commandId];
  }
}

- (BOOL)validateToolbarItem:(NSToolbarItem *)item
{
  NSString *commandId = _definitions[item.itemIdentifier][@"id"];
  return commandId && [OneMacosAppCommandTargetInWindow(_window) oneMacosCanPerformAppCommand:commandId];
}

- (void)applyConfig:(OneMacosAppCommandConfig *)config
{
  if (config != _config) {
    NSMutableArray *identifiers = [NSMutableArray new];
    NSMutableDictionary *definitions = [NSMutableDictionary new];
    for (const auto &entry : config->_toolbar) {
      if (entry["kind"].getString() == "flexibleSpace") {
        [identifiers addObject:NSToolbarFlexibleSpaceItemIdentifier];
        continue;
      }
      NSString *commandId = @(entry["id"].getString().c_str());
      NSString *identifier = [@"OneMacos.Command." stringByAppendingString:commandId];
      NSMutableDictionary *definition = [@{
        @"id": commandId, @"label": @(entry["label"].getString().c_str()),
        @"image": @(entry["systemImage"].getString().c_str())
      } mutableCopy];
      if (auto *badge = member(entry, "badge")) definition[@"badge"] = @((NSInteger)badge->asDouble());
      definitions[identifier] = definition;
      [identifiers addObject:identifier];
    }
    NSDictionary *previous = _definitions;
    _definitions = definitions;
    _config = config;
    _identifiers = identifiers;
    if (_window.toolbar != _toolbar) _window.toolbar = _toolbar;
    if (![[_toolbar.items valueForKey:@"itemIdentifier"] isEqual:identifiers]) {
      for (NSInteger index = (NSInteger)_toolbar.items.count - 1; index >= 0; index--) [_toolbar removeItemAtIndex:index];
      for (NSUInteger index = 0; index < identifiers.count; index++) [_toolbar insertItemWithItemIdentifier:identifiers[index] atIndex:index];
      previous = nil;
    }
    for (NSToolbarItem *item in _toolbar.items) {
      NSDictionary *definition = definitions[item.itemIdentifier];
      if (!definition) continue;
      NSDictionary *old = previous[item.itemIdentifier];
      if (![definition[@"label"] isEqual:old[@"label"]]) {
        item.label = definition[@"label"];
        item.paletteLabel = item.label;
        item.toolTip = item.label;
      }
      if (![definition[@"image"] isEqual:old[@"image"]]) {
        item.image = [NSImage imageWithSystemSymbolName:definition[@"image"] accessibilityDescription:nil];
      }
      if (@available(macOS 26.0, *)) {
        if (![definition[@"badge"] isEqual:old[@"badge"]]) {
          NSInteger count = [definition[@"badge"] integerValue];
          item.badge = count > 0 ? [NSItemBadge badgeWithCount:count] : nil;
        }
      }
    }
  }
  for (NSToolbarItem *item in _toolbar.items) {
    if (_definitions[item.itemIdentifier]) item.enabled = [self validateToolbarItem:item];
  }
}

- (void)restoreToolbar
{
  if (_window.toolbar == _toolbar) _window.toolbar = _previousToolbar;
}
@end

static void OneMacosUpdateWindowToolbars()
{
  static char toolbarKey;
  for (NSWindow *window in NSApp.windows) {
    OneMacosAppCommandConfig *config = [OneMacosAppCommandTargetInWindow(window) oneMacosAppCommandConfig];
    OneMacosWindowToolbar *owner = objc_getAssociatedObject(window, &toolbarKey);
    if (config && config->_toolbar.isArray()) {
      if (!owner) {
        owner = [[OneMacosWindowToolbar alloc] initWithWindow:window];
        objc_setAssociatedObject(window, &toolbarKey, owner, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
      }
      [owner applyConfig:config];
    } else if (owner) {
      [owner restoreToolbar];
      objc_setAssociatedObject(window, &toolbarKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
  }
}

// the key window's runtime, as AppKit routes an untargeted action; an inactive
// app has no key window, so it falls back to the frontmost One window
static NSView<OneMacosAppCommandTarget> *OneMacosCurrentAppCommandTarget()
{
  if (NSView<OneMacosAppCommandTarget> *view = OneMacosAppCommandTargetInWindow(NSApp.keyWindow)) {
    return view;
  }
  if (NSView<OneMacosAppCommandTarget> *view = OneMacosAppCommandTargetInWindow(NSApp.mainWindow)) {
    return view;
  }
  for (NSWindow *window in NSApp.orderedWindows) {
    NSView<OneMacosAppCommandTarget> *view = window.isVisible ? OneMacosAppCommandTargetInWindow(window) : nil;
    if (view) {
      return view;
    }
  }
  return nil;
}

@interface OneMacosAppCommandRouter : NSObject <NSMenuItemValidation>
@end

@implementation OneMacosAppCommandRouter

+ (instancetype)shared
{
  static OneMacosAppCommandRouter *router = [OneMacosAppCommandRouter new];
  return router;
}

- (void)performAppCommand:(NSMenuItem *)item
{
  OneMacosAppCommandBinding *binding = item.representedObject;
  NSView<OneMacosAppCommandTarget> *target = OneMacosCurrentAppCommandTarget();
  if ([target oneMacosCanPerformAppCommand:binding.commandId]) {
    [target oneMacosPerformAppCommand:binding.commandId];
  }
}

// a binding's context only gates its key equivalent, so a menu click still runs
// the command; a gated key goes on to the focused view
- (BOOL)validateMenuItem:(NSMenuItem *)item
{
  OneMacosAppCommandBinding *binding = item.representedObject;
  NSView<OneMacosAppCommandTarget> *target = OneMacosCurrentAppCommandTarget();
  if (![target oneMacosCanPerformAppCommand:binding.commandId]) {
    return NO;
  }
  if (binding->_context && NSApp.currentEvent.type == NSEventTypeKeyDown) {
    BOOL inputFocused = [target.window.firstResponder conformsToProtocol:@protocol(NSTextInputClient)];
    return binding->_context->matches(inputFocused);
  }
  return YES;
}

@end

static NSMenuItem *OneMacosAppCommandItem(NSString *title, OneMacosAppCommandBinding *binding)
{
  NSMenuItem *item = [[NSMenuItem alloc] initWithTitle:title action:@selector(performAppCommand:) keyEquivalent:binding.keyEquivalent ?: @""];
  item.keyEquivalentModifierMask = binding.modifiers;
  item.target = [OneMacosAppCommandRouter shared];
  item.representedObject = binding;
  return item;
}

static NSArray<NSMenuItem *> *OneMacosAppCommandMenuItems(
    const folly::dynamic &items, NSDictionary<NSString *, OneMacosAppCommandBinding *> *shown)
{
  NSMutableArray<NSMenuItem *> *result = [NSMutableArray new];
  for (const auto &item : items) {
    std::string kind = item["kind"].getString();
    if (kind == "separator") {
      [result addObject:NSMenuItem.separatorItem];
      continue;
    }
    NSString *label = @(item["label"].getString().c_str());
    if (kind == "submenu") {
      NSMenuItem *parent = [[NSMenuItem alloc] initWithTitle:label action:nil keyEquivalent:@""];
      parent.submenu = [[NSMenu alloc] initWithTitle:label];
      for (NSMenuItem *child in OneMacosAppCommandMenuItems(item["items"], shown)) {
        [parent.submenu addItem:child];
      }
      [result addObject:parent];
      continue;
    }
    NSString *commandId = @(item["id"].getString().c_str());
    OneMacosAppCommandBinding *binding = shown[commandId];
    if (!binding) {
      binding = [OneMacosAppCommandBinding new];
      binding.commandId = commandId;
    }
    [result addObject:OneMacosAppCommandItem(label, binding)];
  }
  return result;
}

static NSMutableArray<NSMenuItem *> *OneMacosInstalledAppCommandItems()
{
  static NSMutableArray<NSMenuItem *> *installed = [NSMutableArray new];
  return installed;
}

static BOOL OneMacosPerformControlTab(NSEvent *event)
{
  NSEventModifierFlags flags = event.modifierFlags & (NSEventModifierFlagCommand | NSEventModifierFlagShift |
                                                      NSEventModifierFlagOption | NSEventModifierFlagControl);
  if (event.keyCode != kVK_Tab || !(flags & NSEventModifierFlagControl)) {
    return NO;
  }
  for (NSMenuItem *item in OneMacosInstalledAppCommandItems()) {
    OneMacosAppCommandBinding *binding = item.action == @selector(performAppCommand:) ? item.representedObject : nil;
    if ([binding.keyEquivalent isEqualToString:@"\t"] && binding.modifiers == flags &&
        [OneMacosAppCommandRouter.shared validateMenuItem:item]) {
      [item.menu performActionForItemAtIndex:[item.menu indexOfItem:item]];
      return YES;
    }
  }
  return NO;
}

static BOOL OneMacosInMainMenu(NSMenuItem *item)
{
  NSMenu *menu = item.menu;
  while (menu.supermenu) {
    menu = menu.supermenu;
  }
  return menu && menu == NSApp.mainMenu;
}

static void OneMacosApplyAppCommands(OneMacosAppCommandConfig *_Nullable config)
{
  NSMutableArray<NSMenuItem *> *installed = OneMacosInstalledAppCommandItems();
  for (NSMenuItem *item in installed) {
    [item.menu removeItem:item];
  }
  [installed removeAllObjects];
  if (!config) {
    return;
  }

  NSMenu *mainMenu = NSApp.mainMenu;
  if (!mainMenu) {
    mainMenu = [NSMenu new];
    NSApp.mainMenu = mainMenu;
  }

  // each menu item shows the first key of its command
  NSMutableDictionary<NSString *, OneMacosAppCommandBinding *> *shown = [NSMutableDictionary new];
  for (OneMacosAppCommandBinding *binding in config->_bindings) {
    if (!shown[binding.commandId]) {
      shown[binding.commandId] = binding;
    }
  }

  auto insert = ^(NSMenu *menu, NSInteger index, NSArray<NSMenuItem *> *items) {
    for (NSMenuItem *item in items) {
      [menu insertItem:item atIndex:index++];
      [installed addObject:item];
    }
  };

  // as in GPUI the first menu is the application menu; it takes the commands
  // after About, so Settings, Services, Hide and Quit stay below them
  NSMenu *applicationMenu = mainMenu.numberOfItems > 0 ? mainMenu.itemArray.firstObject.submenu : nil;
  NSInteger insertTopLevelAt = NSApp.windowsMenu ? [mainMenu indexOfItemWithSubmenu:NSApp.windowsMenu] : -1;
  if (insertTopLevelAt < 0) {
    insertTopLevelAt = mainMenu.numberOfItems;
  }

  for (size_t index = 0; index < config->_menus.size(); index++) {
    const auto &menu = config->_menus[index];
    NSString *label = @(menu["label"].getString().c_str());
    NSMutableArray<NSMenuItem *> *items = [OneMacosAppCommandMenuItems(menu["items"], shown) mutableCopy];
    NSMenu *existing = nil;
    if (index == 0) {
      existing = applicationMenu;
    } else {
      for (NSInteger top = 1; top < mainMenu.numberOfItems && !existing; top++) {
        NSMenuItem *item = [mainMenu itemAtIndex:top];
        if ([item.submenu.title isEqualToString:label]) {
          existing = item.submenu;
        }
      }
    }
    if (existing == applicationMenu && applicationMenu) {
      NSInteger about = [applicationMenu.itemArray indexOfObjectPassingTest:^BOOL(NSMenuItem *item, NSUInteger, BOOL *) {
        return item.separatorItem;
      }];
      [items addObject:NSMenuItem.separatorItem];
      insert(applicationMenu, about == NSNotFound ? 0 : about + 1, items);
    } else if (existing) {
      [items insertObject:NSMenuItem.separatorItem atIndex:0];
      insert(existing, existing.numberOfItems, items);
    } else {
      NSMenuItem *top = [[NSMenuItem alloc] initWithTitle:label action:nil keyEquivalent:@""];
      top.submenu = [[NSMenu alloc] initWithTitle:label];
      for (NSMenuItem *item in items) {
        [top.submenu addItem:item];
      }
      insert(mainMenu, insertTopLevelAt++, @[ top ]);
    }
  }

  // every key also gets a hidden item at the top of the menu bar, which AppKit
  // searches first, so a binding wins over a standard item with the same key
  NSMenu *hiddenMenu = applicationMenu;
  if (!hiddenMenu) {
    NSMenuItem *top = [NSMenuItem new];
    top.submenu = [NSMenu new];
    top.hidden = YES;
    insert(mainMenu, 0, @[ top ]);
    hiddenMenu = top.submenu;
  }
  NSMutableArray<NSMenuItem *> *hidden = [NSMutableArray new];
  for (OneMacosAppCommandBinding *binding in config->_bindings) {
    NSMenuItem *item = OneMacosAppCommandItem(binding.commandId, binding);
    item.hidden = YES;
    item.allowsKeyEquivalentWhenHidden = YES;
    [hidden addObject:item];
  }
  insert(hiddenMenu, 0, hidden);
}

void OneMacosUpdateAppCommands(void)
{
  NSCAssert(NSThread.isMainThread, @"update app commands on the main thread");
  OneMacosUpdateWindowToolbars();
  static OneMacosAppCommandConfig *shown;
  OneMacosAppCommandConfig *config = [OneMacosCurrentAppCommandTarget() oneMacosAppCommandConfig];
  BOOL attached = YES;
  for (NSMenuItem *item in OneMacosInstalledAppCommandItems()) {
    attached = attached && OneMacosInMainMenu(item);
  }
  // SwiftUI rebuilds the menus it owns, such as the application and View
  // menus, as scenes and windows change, so this also restores detached items
  if (config != shown || !attached) {
    shown = config;
    OneMacosApplyAppCommands(config);
  }
}
