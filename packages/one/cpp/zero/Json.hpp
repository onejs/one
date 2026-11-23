#pragma once

#include <charconv>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <map>
#include <stdexcept>
#include <string>
#include <string_view>
#include <variant>
#include <vector>

namespace one::zero {

struct Json {
  using Array = std::vector<Json>;
  using Object = std::map<std::string, Json>;
  std::variant<std::nullptr_t, bool, double, std::string, Array, Object> value = nullptr;
  Json() = default;
  Json(std::nullptr_t) {}
  Json(bool v) : value(v) {}
  Json(double v) : value(v) {}
  Json(int v) : value(static_cast<double>(v)) {}
  Json(std::string v) : value(std::move(v)) {}
  Json(const char* v) : value(std::string(v)) {}
  Json(Array v) : value(std::move(v)) {}
  Json(Object v) : value(std::move(v)) {}
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
  // strict RFC 8259. later duplicate keys replace earlier ones.
  static Json parse(std::string_view text) {
    if (text.empty()) throw std::runtime_error("invalid JSON");
    Parser parser{text.data(), text.data() + text.size()};
    parser.space();
    if (parser.at == parser.end) throw std::runtime_error("invalid JSON");
    Json result = parser.value(0);
    parser.space();
    if (parser.at != parser.end) throw std::runtime_error("invalid JSON");
    return result;
  }

 private:
  struct Parser {
    const char* at;
    const char* end;
    [[noreturn]] static void invalid() { throw std::runtime_error("invalid JSON"); }
    void space() {
      while (at != end && (*at == ' ' || *at == '\n' || *at == '\r' || *at == '\t')) ++at;
    }
    void expect(std::string_view word) {
      if (static_cast<size_t>(end - at) < word.size() ||
          std::string_view(at, word.size()) != word)
        invalid();
      at += word.size();
    }
    template <typename Element>
    void elements(Element&& element) {
      ++at;
      space();
      if (at != end && *at == ']') {
        ++at;
        return;
      }
      while (true) {
        space();
        element();
        space();
        if (at == end) invalid();
        if (*at == ']') {
          ++at;
          return;
        }
        if (*at != ',') invalid();
        ++at;
      }
    }
    Json value(unsigned depth) {
      if (depth > 128) throw std::runtime_error("JSON nesting exceeds 128 levels");
      if (at == end) invalid();
      switch (*at) {
        case '{': {
          ++at;
          Object object;
          space();
          if (at != end && *at == '}') {
            ++at;
            return object;
          }
          while (true) {
            space();
            if (at == end || *at != '"') invalid();
            std::string key;
            string(key);
            space();
            if (at == end || *at != ':') invalid();
            ++at;
            space();
            object.insert_or_assign(std::move(key), value(depth + 1));
            space();
            if (at == end) invalid();
            if (*at == '}') {
              ++at;
              return object;
            }
            if (*at != ',') invalid();
            ++at;
          }
        }
        case '[': {
          Array array;
          elements([&] { array.push_back(value(depth + 1)); });
          return array;
        }
        case '"': {
          std::string text;
          string(text);
          return text;
        }
        case 't':
          expect("true");
          return true;
        case 'f':
          expect("false");
          return false;
        case 'n':
          expect("null");
          return nullptr;
        default:
          return number();
      }
    }
    unsigned hex4() {
      if (end - at < 4) invalid();
      unsigned code = 0;
      for (int i = 0; i < 4; ++i) {
        char c = *at++;
        code <<= 4;
        if (c >= '0' && c <= '9')
          code |= c - '0';
        else if (c >= 'a' && c <= 'f')
          code |= c - 'a' + 10;
        else if (c >= 'A' && c <= 'F')
          code |= c - 'A' + 10;
        else
          invalid();
      }
      return code;
    }
    static void utf8(std::string& out, unsigned code) {
      if (code < 0x80)
        out += static_cast<char>(code);
      else if (code < 0x800) {
        out += static_cast<char>(0xC0 | (code >> 6));
        out += static_cast<char>(0x80 | (code & 0x3F));
      } else if (code < 0x10000) {
        out += static_cast<char>(0xE0 | (code >> 12));
        out += static_cast<char>(0x80 | ((code >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (code & 0x3F));
      } else {
        out += static_cast<char>(0xF0 | (code >> 18));
        out += static_cast<char>(0x80 | ((code >> 12) & 0x3F));
        out += static_cast<char>(0x80 | ((code >> 6) & 0x3F));
        out += static_cast<char>(0x80 | (code & 0x3F));
      }
    }
    void string(std::string& out) {
      ++at;
      while (true) {
        const char* run = at;
        while (at != end && *at != '"' && *at != '\\' && static_cast<unsigned char>(*at) >= 0x20)
          ++at;
        out.append(run, at);
        if (at == end || static_cast<unsigned char>(*at) < 0x20) invalid();
        if (*at++ == '"') return;
        if (at == end) invalid();
        char escaped = *at++;
        switch (escaped) {
          case '"': case '\\': case '/': break;
          case 'b': escaped = '\b'; break;
          case 'f': escaped = '\f'; break;
          case 'n': escaped = '\n'; break;
          case 'r': escaped = '\r'; break;
          case 't': escaped = '\t'; break;
          case 'u': {
            unsigned code = hex4();
            if (code >= 0xD800 && code < 0xDC00 && end - at >= 6 && at[0] == '\\' &&
                at[1] == 'u') {
              const char* low = at;
              at += 2;
              unsigned next = hex4();
              if (next >= 0xDC00 && next < 0xE000)
                code = 0x10000 + ((code - 0xD800) << 10) + (next - 0xDC00);
              else
                at = low;
            }
            utf8(out, code);
            continue;
          }
          default:
            invalid();
        }
        out += escaped;
      }
    }
    Json number() {
      const char* start = at;
      bool negative = at != end && *at == '-';
      if (negative) ++at;
      if (at == end || *at < '0' || *at > '9') invalid();
      uint64_t mantissa = 0;
      int digits = 0;
      int exponent = 0;
      bool real = false;
      auto digit = [&](char c) {
        if (digits < 19) {
          mantissa = mantissa * 10 + static_cast<uint64_t>(c - '0');
          if (mantissa) ++digits;
        } else
          ++exponent;
      };
      if (*at == '0')
        ++at;
      else
        while (at != end && *at >= '0' && *at <= '9') digit(*at++);
      if (at != end && *at == '.') {
        real = true;
        ++at;
        if (at == end || *at < '0' || *at > '9') invalid();
        for (; at != end && *at >= '0' && *at <= '9'; ++at) {
          if (digits < 19) {
            --exponent;
            digit(*at);
          }
        }
      }
      if (at != end && (*at == 'e' || *at == 'E')) {
        real = true;
        ++at;
        bool minus = at != end && *at == '-';
        if (at != end && (*at == '+' || *at == '-')) ++at;
        if (at == end || *at < '0' || *at > '9') invalid();
        int written = 0;
        while (at != end && *at >= '0' && *at <= '9') {
          if (written < 100000) written = written * 10 + (*at - '0');
          ++at;
        }
        exponent += minus ? -written : written;
      }
      static const double powers[] = {1e0,  1e1,  1e2,  1e3,  1e4,  1e5,  1e6,  1e7,
                                      1e8,  1e9,  1e10, 1e11, 1e12, 1e13, 1e14, 1e15,
                                      1e16, 1e17, 1e18, 1e19, 1e20, 1e21, 1e22};
      double result;
      // a mantissa and power of ten that are both exact round correctly in one step.
      if (digits <= 19 && exponent == 0 && !real)
        result = static_cast<double>(mantissa);
      else if (mantissa <= (uint64_t(1) << 53) && exponent >= -22 && exponent <= 22)
        result = exponent < 0 ? static_cast<double>(mantissa) / powers[-exponent]
                              : static_cast<double>(mantissa) * powers[exponent];
      else
        result = std::strtod(std::string(start + negative, at).c_str(), nullptr);
      if (!std::isfinite(result)) throw std::runtime_error("JSON number is outside the finite range");
      // integer zero carries no sign, matching sqlite's integer atoms.
      return negative && (real || result != 0) ? -result : result;
    }
  };

 public:
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
