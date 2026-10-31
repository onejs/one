#pragma once

namespace facebook::react {

// native edits survive stale props until react acknowledges them; a new
// revision resets the native event count and applies the supplied value
template <typename Value>
class OneLinuxControlledValue {
 public:
  void update(Value value, int revision, int acknowledgedEvent)
  {
    if (revision != revision_) {
      revision_ = revision;
      eventCount_ = 0;
      value_ = value;
    } else if (acknowledgedEvent >= eventCount_) {
      value_ = value;
    }
  }

  template <typename Apply>
  void apply(Apply apply)
  {
    applying_ = true;
    apply(value_);
    applying_ = false;
  }

  bool record(Value value)
  {
    if (applying_) {
      return false;
    }
    value_ = value;
    eventCount_++;
    return true;
  }

  bool applying() const { return applying_; }
  Value value() const { return value_; }
  int eventCount() const { return eventCount_; }
  int revision() const { return revision_; }

 private:
  Value value_{};
  int eventCount_{0};
  int revision_{0};
  bool applying_{false};
};

} // namespace facebook::react
