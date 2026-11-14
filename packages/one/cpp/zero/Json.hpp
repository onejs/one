#pragma once

#include <sqlite3.h>
#include <charconv>
#include <cmath>
#include <map>
#include <stdexcept>
#include <string>
#include <variant>
#include <vector>

namespace one::zero {

struct Json {
  using Array = std::vector<Json>;
  using Object = std::map<std::string, Json>;
  struct Serialized {
    std::string text;
    bool operator==(const Serialized&) const = default;
  };
  std::variant<std::nullptr_t, bool, double, std::string, Array, Object, Serialized> value = nullptr;
  Json() = default;
  Json(std::nullptr_t) {}
  Json(bool v) : value(v) {}
  Json(double v) : value(v) {}
  Json(int v) : value(static_cast<double>(v)) {}
  Json(std::string v) : value(std::move(v)) {}
  Json(const char* v) : value(std::string(v)) {}
  Json(Array v) : value(std::move(v)) {}
  Json(Object v) : value(std::move(v)) {}
  Json(Serialized v) : value(std::move(v)) {}
  bool null() const { return std::holds_alternative<std::nullptr_t>(value); }
  bool object() const { return std::holds_alternative<Object>(value); }
  bool array() const { return std::holds_alternative<Array>(value); }
  bool has(const std::string& key) const {
    return object() && std::get<Object>(value).contains(key);
  }
  const Json& at(const std::string& key) const {
    if (!object()) throw std::runtime_error("expected a JSON object");
    auto found = std::get<Object>(value).find(key);
    if (found == std::get<Object>(value).end()) throw std::runtime_error("missing field: " + key);
    return found->second;
  }
  const Json& get(const std::string& key) const {
    static const Json absent;
    return has(key) ? at(key) : absent;
  }
  const std::string& string() const {
    if (!std::holds_alternative<std::string>(value)) throw std::runtime_error("expected a string");
    return std::get<std::string>(value);
  }
  const Array& items() const {
    if (!array()) throw std::runtime_error("expected an array");
    return std::get<Array>(value);
  }
  const Object& fields() const {
    if (!object()) throw std::runtime_error("expected an object");
    return std::get<Object>(value);
  }
  double number() const {
    if (!std::holds_alternative<double>(value)) throw std::runtime_error("expected a number");
    return std::get<double>(value);
  }
  bool boolean() const {
    if (!std::holds_alternative<bool>(value)) throw std::runtime_error("expected a boolean");
    return std::get<bool>(value);
  }
  bool flag(const std::string& key) const { return has(key) && at(key).boolean(); }
  bool operator==(const Json&) const = default;
  static void quote(std::string& out, const std::string& str) {
    static const char hex[] = "0123456789abcdef";
    out += '"';
    for (unsigned char c : str) {
      if (c == '"' || c == '\\') {
        out += '\\';
        out += static_cast<char>(c);
      } else if (c < 32) {
        out += "\\u00";
        out += hex[c >> 4];
        out += hex[c & 15];
      } else
        out += static_cast<char>(c);
    }
    out += '"';
  }
  std::string dump() const {
    std::string out;
    append(out);
    return out;
  }
  void append(std::string& out) const {
    if (null())
      out += "null";
    else if (const auto* b = std::get_if<bool>(&value))
      out += *b ? "true" : "false";
    else if (const auto* n = std::get_if<double>(&value)) {
      if (!std::isfinite(*n)) throw std::runtime_error("JSON numbers must be finite");
      if (*n == 0)
        out += '0';
      else {
        char buf[64];
        auto r = std::to_chars(buf, buf + sizeof(buf), *n);
        out.append(buf, r.ptr);
      }
    } else if (const auto* s = std::get_if<std::string>(&value))
      quote(out, *s);
    else if (const auto* serialized = std::get_if<Serialized>(&value))
      out += serialized->text;
    else if (const auto* a = std::get_if<Array>(&value)) {
      out += '[';
      for (size_t i = 0; i < a->size(); ++i) {
        if (i) out += ',';
        (*a)[i].append(out);
      }
      out += ']';
    } else {
      out += '{';
      bool first = true;
      for (const auto& [key, v] : fields()) {
        if (!first) out += ',';
        first = false;
        quote(out, key);
        out += ':';
        v.append(out);
      }
      out += '}';
    }
  }
};

}
