#pragma once

#include <cctype>
#include <cstring>
#include <string>
#include <vector>

namespace facebook::react::commands {

// key contexts share the same predicates on both desktop hosts.
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
    // value comparisons are outside the desktop context contract
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

} // namespace facebook::react::commands
