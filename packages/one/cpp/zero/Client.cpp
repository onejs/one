#include "Client.hpp"
#include "Json.hpp"

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <functional>
#include <limits>
#include <mutex>
#include <optional>
#include <set>
#include <utility>

namespace one::zero {
namespace {
std::atomic<uint64_t> nextTransaction{0};

class Statement {
 public:
  Statement(sqlite3* db, const std::string& sql) : db_(db) {
    if (sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt_, nullptr) != SQLITE_OK)
      throw std::runtime_error(sqlite3_errmsg(db));
  }
  ~Statement() { sqlite3_finalize(stmt_); }
  Statement(const Statement&) = delete;
  sqlite3_stmt* get() const { return stmt_; }
  void bind(int index, const Json& v) {
    int code;
    if (v.null())
      code = sqlite3_bind_null(stmt_, index);
    else if (const auto* s = std::get_if<std::string>(&v.value))
      code =
          sqlite3_bind_text(stmt_, index, s->data(), static_cast<int>(s->size()), SQLITE_TRANSIENT);
    else if (const auto* n = std::get_if<double>(&v.value))
      code = sqlite3_bind_double(stmt_, index, *n);
    else if (const auto* b = std::get_if<bool>(&v.value))
      code = sqlite3_bind_int(stmt_, index, *b);
    else
      throw std::runtime_error("expected a scalar SQL parameter");
    if (code != SQLITE_OK) throw std::runtime_error(sqlite3_errmsg(db_));
  }
  bool step() {
    int code = sqlite3_step(stmt_);
    if (code == SQLITE_ROW) return true;
    if (code != SQLITE_DONE) throw std::runtime_error(sqlite3_errmsg(db_));
    return false;
  }
  std::string text(int col) const {
    auto* value = sqlite3_column_text(stmt_, col);
    return value
               ? std::string(reinterpret_cast<const char*>(value), sqlite3_column_bytes(stmt_, col))
               : "";
  }

 private:
  sqlite3* db_;
  sqlite3_stmt* stmt_ = nullptr;
};

void sql(sqlite3* db, const std::string& text, const std::vector<Json>& args = {}) {
  Statement statement(db, text);
  for (size_t i = 0; i < args.size(); ++i) statement.bind(static_cast<int>(i + 1), args[i]);
  while (statement.step()) {
  }
}

Json parse(sqlite3* db, const std::string& input) {
  Statement valid(db, "SELECT json_valid(?)");
  valid.bind(1, input);
  valid.step();
  if (!sqlite3_column_int(valid.get(), 0)) throw std::runtime_error("invalid JSON");
  Statement tree(db, "SELECT id,parent,key,type,atom FROM json_tree(?)");
  tree.bind(1, input);
  struct Node {
    Json value;
    int64_t parent;
    std::string key;
    std::vector<int64_t> children;
  };
  std::map<int64_t, Node> nodes;
  int64_t root = -1;
  while (tree.step()) {
    int64_t id = sqlite3_column_int64(tree.get(), 0);
    bool isRoot = sqlite3_column_type(tree.get(), 1) == SQLITE_NULL;
    int64_t parent = isRoot ? -1 : sqlite3_column_int64(tree.get(), 1);
    std::string type = tree.text(3);
    Json value;
    if (type == "object")
      value = Json::Object{};
    else if (type == "array")
      value = Json::Array{};
    else if (type == "text")
      value = tree.text(4);
    else if (type == "true" || type == "false")
      value = type == "true";
    else if (type == "integer" || type == "real") {
      double number = sqlite3_column_double(tree.get(), 4);
      if (!std::isfinite(number))
        throw std::runtime_error("JSON number is outside the finite range");
      value = number;
    }
    nodes.emplace(id, Node{std::move(value), parent, tree.text(2), {}});
    if (isRoot)
      root = id;
    else
      nodes.at(parent).children.push_back(id);
  }
  std::function<Json(int64_t, unsigned)> assemble = [&](int64_t id, unsigned depth) -> Json {
    if (depth > 128) throw std::runtime_error("JSON nesting exceeds 128 levels");
    auto& node = nodes.at(id);
    for (int64_t child : node.children) {
      Json value = assemble(child, depth + 1);
      if (node.value.array())
        std::get<Json::Array>(node.value.value).push_back(std::move(value));
      else
        std::get<Json::Object>(node.value.value)
            .insert_or_assign(nodes.at(child).key, std::move(value));
    }
    return std::move(node.value);
  };
  if (root < 0) throw std::runtime_error("expected a JSON value");
  return assemble(root, 0);
}

std::string quoted(const std::string& s) {
  std::string result = "'";
  for (char c : s) {
    result += c;
    if (c == '\'') result += '\'';
  }
  return result + "'";
}

void like(sqlite3_context* context, int, sqlite3_value** args) {
  if (sqlite3_value_type(args[0]) == SQLITE_NULL || sqlite3_value_type(args[1]) == SQLITE_NULL) {
    sqlite3_result_null(context);
    return;
  }
  if (sqlite3_value_type(args[0]) != SQLITE_TEXT || sqlite3_value_type(args[1]) != SQLITE_TEXT) {
    sqlite3_result_error(context, "LIKE requires strings", -1);
    return;
  }
  const auto* input = static_cast<const char16_t*>(sqlite3_value_text16(args[0]));
  const auto* pattern = static_cast<const char16_t*>(sqlite3_value_text16(args[1]));
  std::u16string text(input, sqlite3_value_bytes16(args[0]) / 2);
  std::u16string source(pattern, sqlite3_value_bytes16(args[1]) / 2);
  struct Token {
    char16_t value;
    bool literal;
  };
  std::vector<Token> tokens;
  for (size_t i = 0; i < source.size(); ++i) {
    if (source[i] == u'\\') {
      if (++i == source.size()) {
        sqlite3_result_error(context, "LIKE pattern must not end with escape character", -1);
        return;
      }
      tokens.push_back({source[i], true});
    } else
      tokens.push_back({source[i], source[i] != u'%' && source[i] != u'_'});
  }
  std::vector<bool> previous(text.size() + 1), next(text.size() + 1);
  previous[0] = true;
  for (const auto& token : tokens) {
    std::fill(next.begin(), next.end(), false);
    if (!token.literal && token.value == u'%') next[0] = previous[0];
    for (size_t i = 1; i <= text.size(); ++i)
      next[i] = !token.literal && token.value == u'%'
                    ? previous[i] || next[i - 1]
                    : previous[i - 1] &&
                          ((!token.literal && token.value == u'_') || text[i - 1] == token.value);
    previous.swap(next);
  }
  sqlite3_result_int(context, previous.back());
}

int64_t integer(const Json& value, const std::string& label) {
  double number = value.number();
  if (number < 0 || number > 9007199254740991.0 || std::floor(number) != number)
    throw std::runtime_error(label + " must be a nonnegative safe integer");
  return static_cast<int64_t>(number);
}

struct Table {
  std::map<std::string, std::string> columns;
  std::map<std::string, std::string> serverColumns;
  std::set<std::string> optional;
  std::vector<std::string> primaryKey;
};

struct Compiled {
  std::string sql;
  std::vector<Json> args;
};

}

struct Client::Impl {
  sqlite3* db = nullptr;
  std::mutex mutex;
  std::map<std::string, Table> tables;
  std::map<std::string, std::string> serverTables;
  std::string clientID;
  std::string transaction;
  std::string transactionKind;

  Impl(const std::string& path, const std::string& schemaText, const std::string& identity)
      : clientID(identity) {
    if (path.empty() || path.find('\0') != std::string::npos || identity.empty())
      throw std::runtime_error("database path and client identity are required");
    if (sqlite3_open_v2(path.c_str(), &db,
                        SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
                        nullptr) != SQLITE_OK) {
      std::string reason = sqlite3_errmsg(db);
      sqlite3_close_v2(db);
      db = nullptr;
      throw std::runtime_error(reason);
    }
    try {
      sqlite3_busy_timeout(db, 5000);
      sqlite3_create_function_v2(db, "one_zero_like", 2, SQLITE_UTF8 | SQLITE_DETERMINISTIC,
                                 nullptr, like, nullptr, nullptr, nullptr);
      Json schema = parse(db, schemaText);
      for (const auto& [name, description] : schema.at("tables").fields()) {
        if (name.empty() || name.find('\0') != std::string::npos)
          throw std::runtime_error("invalid table name");
        Table table;
        for (const auto& [column, definition] : description.at("columns").fields()) {
          if (column.empty() || column.find('\0') != std::string::npos)
            throw std::runtime_error("invalid column name");
          std::string type = definition.at("type").string();
          if (type != "string" && type != "number" && type != "boolean" && type != "json")
            throw std::runtime_error("unsupported column type: " + type);
          table.columns.emplace(column, type);
          std::string serverColumn =
              definition.has("serverName") ? definition.at("serverName").string() : column;
          if (!table.serverColumns.emplace(serverColumn, column).second)
            throw std::runtime_error("duplicate server column name");
          if (definition.flag("optional")) table.optional.insert(column);
        }
        for (const Json& field : description.at("primaryKey").items()) {
          if (!table.columns.contains(field.string()))
            throw std::runtime_error("unknown primary key column");
          table.primaryKey.push_back(field.string());
        }
        if (table.primaryKey.empty()) throw std::runtime_error("table requires a primary key");
        std::string serverName =
            description.has("serverName") ? description.at("serverName").string() : name;
        if (!serverTables.emplace(serverName, name).second)
          throw std::runtime_error("duplicate server table name");
        tables.emplace(name, std::move(table));
      }
      sql(db, "PRAGMA journal_mode=WAL");
      sql(db, "PRAGMA synchronous=FULL");
      sql(db, "BEGIN IMMEDIATE");
      sql(db, "CREATE TABLE IF NOT EXISTS one_zero_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)");
      sql(db,
          "CREATE TABLE IF NOT EXISTS one_zero_base(table_name TEXT NOT NULL,key TEXT NOT "
          "NULL,value TEXT NOT NULL,PRIMARY KEY(table_name,key))");
      sql(db,
          "CREATE TABLE IF NOT EXISTS one_zero_view(table_name TEXT NOT NULL,key TEXT NOT "
          "NULL,value TEXT NOT NULL,PRIMARY KEY(table_name,key))");
      sql(db,
          "CREATE TABLE IF NOT EXISTS one_zero_mutations(id INTEGER PRIMARY KEY,name TEXT NOT "
          "NULL,args TEXT NOT NULL,timestamp REAL NOT NULL)");
      std::string canonical = schema.dump();
      if (!meta("formatVersion").null() && meta("formatVersion") != Json(1))
        throw std::runtime_error("unsupported native Zero store format");
      auto existing = meta("schema");
      if (!existing.null() && existing != Json(canonical))
        throw std::runtime_error("native Zero schema differs from the persisted store");
      if (!meta("clientID").null() && meta("clientID") != Json(clientID))
        throw std::runtime_error("native Zero client identity differs from the persisted store");
      setMeta("schema", canonical);
      setMeta("formatVersion", 1);
      setMeta("clientID", clientID);
      if (meta("nextMutationID").null()) setMeta("nextMutationID", 1);
      if (meta("lastMutationID").null()) setMeta("lastMutationID", 0);
      if (meta("cookie").null()) setMeta("cookie", Json());
      if (meta("queryVersion").null()) setMeta("queryVersion", 0);
      if (meta("queries").null()) setMeta("queries", Json::Array{});
      sql(db, "COMMIT");
    } catch (...) {
      sqlite3_close_v2(db);
      db = nullptr;
      throw;
    }
  }
  ~Impl() {
    if (db) sqlite3_close_v2(db);
  }

  Json meta(const std::string& name) {
    Statement statement(db, "SELECT value FROM one_zero_meta WHERE key=?");
    statement.bind(1, name);
    return statement.step() ? parse(db, statement.text(0)) : Json();
  }
  void setMeta(const std::string& name, const Json& value) {
    sql(db,
        "INSERT INTO one_zero_meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        {name, value.dump()});
  }
  const Table& table(const std::string& name) const {
    auto found = tables.find(name);
    if (found == tables.end()) throw std::runtime_error("unknown table: " + name);
    return found->second;
  }
  std::string key(const std::string& name, const Json& row) const {
    Json::Array parts;
    for (const auto& field : table(name).primaryKey) {
      const Json& value = row.at(field);
      if (value.null() || value.object() || value.array())
        throw std::runtime_error("primary keys must be non-null scalars");
      parts.push_back(value);
    }
    return Json(std::move(parts)).dump();
  }
  void validate(const std::string& name, Json& row) const {
    const auto& definition = table(name);
    for (const auto& [column, value] : row.fields())
      if (!definition.columns.contains(column))
        throw std::runtime_error("unknown column: " + name + "." + column);
    auto& fields = std::get<Json::Object>(row.value);
    for (const auto& [column, type] : definition.columns) {
      auto found = fields.find(column);
      if (found == fields.end()) {
        if (!definition.optional.contains(column))
          throw std::runtime_error("missing required column: " + column);
        found = fields.emplace(column, Json()).first;
      }
      const auto& value = found->second;
      if (value.null()) {
        if (!definition.optional.contains(column))
          throw std::runtime_error("required column is null: " + column);
      } else if ((type == "string" && !std::holds_alternative<std::string>(value.value)) ||
                 (type == "number" && !std::holds_alternative<double>(value.value)) ||
                 (type == "boolean" && !std::holds_alternative<bool>(value.value)))
        throw std::runtime_error("invalid column type: " + column);
    }
    key(name, row);
  }
  void write(const std::string& target, const std::string& kind, const std::string& name,
             Json value) {
    std::string rowKey = key(name, value);
    if (kind == "delete") {
      sql(db, "DELETE FROM " + target + " WHERE table_name=? AND key=?", {name, rowKey});
      return;
    }
    if (kind == "update") {
      Statement existing(db, "SELECT value FROM " + target + " WHERE table_name=? AND key=?");
      existing.bind(1, name);
      existing.bind(2, rowKey);
      if (!existing.step()) return;
      Json old = parse(db, existing.text(0));
      for (const auto& [column, field] : value.fields())
        std::get<Json::Object>(old.value).insert_or_assign(column, field);
      value = std::move(old);
    }
    validate(name, value);
    std::string suffix;
    if (kind == "upsert" || kind == "update")
      suffix = " ON CONFLICT(table_name,key) DO UPDATE SET value=excluded.value";
    else if (kind != "insert")
      throw std::runtime_error("unsupported write kind: " + kind);
    sql(db, "INSERT INTO " + target + " VALUES(?,?,?)" + suffix, {name, rowKey, value.dump()});
  }
  std::pair<std::string, Json> mapServerRow(const std::string& serverName, const Json& row) {
    auto found = serverTables.find(serverName);
    if (found == serverTables.end())
      throw std::runtime_error("unknown server table: " + serverName);
    const auto& name = found->second;
    Json::Object mapped;
    for (const auto& [column, value] : row.fields()) {
      auto local = table(name).serverColumns.find(column);
      if (local == table(name).serverColumns.end())
        throw std::runtime_error("unknown server column: " + column);
      mapped.emplace(local->second, value);
    }
    return {name, mapped};
  }

  std::string column(const std::string& name, const std::string& field,
                     const std::string& alias) const {
    if (!table(name).columns.contains(field))
      throw std::runtime_error("unknown query column: " + field);
    std::string path = "$." + Json(field).dump();
    return "json_extract(" + alias + ".value," + quoted(path) + ") COLLATE BINARY";
  }
  std::string operand(const Json& value, const std::string& name, const std::string& alias,
                      std::vector<Json>& args) {
    std::string type = value.at("type").string();
    if (type == "column") return column(name, value.at("name").string(), alias);
    if (type != "literal")
      throw std::runtime_error("query parameters must be bound before native execution");
    const auto& literal = value.at("value");
    if (literal.object() || literal.array())
      throw std::runtime_error("expected a scalar query literal");
    args.push_back(literal);
    return "?";
  }
  std::string condition(const Json& value, const std::string& name, const std::string& alias,
                        std::vector<Json>& args, unsigned depth) {
    if (depth > 32) throw std::runtime_error("query nesting exceeds 32 levels");
    std::string type = value.at("type").string();
    if (type == "and" || type == "or") {
      std::string result;
      for (const auto& item : value.at("conditions").items()) {
        if (!result.empty()) result += type == "and" ? " AND " : " OR ";
        result += condition(item, name, alias, args, depth + 1);
      }
      return "(" + (result.empty() ? (type == "and" ? "1" : "0") : result) + ")";
    }
    if (type == "correlatedSubquery") {
      std::string op = value.at("op").string();
      if (op != "EXISTS" && op != "NOT EXISTS")
        throw std::runtime_error("unsupported correlated predicate");
      const Json& related = value.at("related");
      std::string child = alias + "c";
      auto query = compile(related.at("subquery"), child, &related.at("correlation"), name, alias,
                           nullptr, depth + 1);
      args.insert(args.end(), query.args.begin(), query.args.end());
      return op + "(" + query.sql + ")";
    }
    if (type != "simple") throw std::runtime_error("unsupported query condition: " + type);
    std::string op = value.at("op").string();
    const Json& right = value.at("right");
    std::string left = operand(value.at("left"), name, alias, args);
    if (op == "IN" || op == "NOT IN") {
      if (right.at("type").string() != "literal")
        throw std::runtime_error("IN requires bound values");
      const auto& list = right.at("value").items();
      if (list.empty()) return "(" + left + " IS NOT NULL AND " + (op == "IN" ? "0" : "1") + ")";
      std::string placeholders;
      for (const auto& item : list) {
        if (!placeholders.empty()) placeholders += ',';
        placeholders += '?';
        args.push_back(item);
      }
      return "(" + left + " " + op + " (" + placeholders + "))";
    }
    static const std::set<std::string> operators = {
        "=", "!=", "IS", "IS NOT", "<", ">", "<=", ">=", "LIKE", "NOT LIKE", "ILIKE", "NOT ILIKE"};
    if (!operators.contains(op)) throw std::runtime_error("unsupported query operator: " + op);
    std::string rhs = operand(right, name, alias, args);
    if (op == "ILIKE" || op == "NOT ILIKE")
      throw std::runtime_error("native Unicode ILIKE is not yet supported");
    if (op == "LIKE" || op == "NOT LIKE") {
      return std::string(op.starts_with("NOT ") ? "NOT " : "") + "one_zero_like(" + left + "," +
             rhs + ")";
    }
    return "(" + left + " " + op + " " + rhs + ")";
  }

  Compiled compile(const Json& ast, const std::string& alias, const Json* correlation = nullptr,
                   const std::string& parentTable = "", const std::string& parentAlias = "",
                   const Json* parentRow = nullptr, unsigned depth = 0) {
    if (depth > 32) throw std::runtime_error("query nesting exceeds 32 levels");
    std::string name = ast.at("table").string();
    const auto& definition = table(name);
    if (ast.has("schema"))
      throw std::runtime_error("schema-qualified native queries are not supported");
    Compiled out{"SELECT " + alias + ".value FROM one_zero_view " + alias + " WHERE " + alias +
                     ".table_name=?",
                 {name}};
    if (correlation) {
      const auto& parent = correlation->at("parentField").items();
      const auto& child = correlation->at("childField").items();
      if (parent.empty() || parent.size() != child.size())
        throw std::runtime_error("invalid relationship correlation");
      for (size_t i = 0; i < parent.size(); ++i) {
        out.sql += " AND " + column(name, child[i].string(), alias) + "=";
        if (parentRow) {
          out.sql += '?';
          out.args.push_back(parentRow->at(parent[i].string()));
        } else
          out.sql += column(parentTable, parent[i].string(), parentAlias);
      }
    }
    if (ast.has("where"))
      out.sql += " AND " + condition(ast.at("where"), name, alias, out.args, depth + 1);
    std::vector<std::pair<std::string, std::string>> ordering;
    if (ast.has("orderBy")) {
      for (const auto& pair : ast.at("orderBy").items()) {
        if (pair.items().size() != 2) throw std::runtime_error("invalid ordering");
        std::string direction = pair.items()[1].string();
        if (direction != "asc" && direction != "desc")
          throw std::runtime_error("invalid ordering direction");
        ordering.emplace_back(pair.items()[0].string(), direction);
      }
    }
    for (const auto& field : definition.primaryKey) {
      if (std::none_of(ordering.begin(), ordering.end(),
                       [&](const auto& o) { return o.first == field; }))
        ordering.emplace_back(field, "asc");
    }
    if (ast.has("start")) {
      const Json& start = ast.at("start");
      std::string bounds;
      for (size_t i = 0; i < ordering.size(); ++i) {
        if (i) bounds += " OR ";
        bounds += '(';
        for (size_t j = 0; j < i; ++j) {
          bounds += column(name, ordering[j].first, alias) + " IS ? AND ";
          out.args.push_back(start.at("row").at(ordering[j].first));
        }
        std::string col = column(name, ordering[i].first, alias);
        const Json& bound = start.at("row").at(ordering[i].first);
        bool asc = ordering[i].second == "asc";
        if (bound.null())
          bounds += asc ? col + " IS NOT NULL" : "0";
        else {
          bounds += asc ? col + ">?" : "(" + col + "<? OR " + col + " IS NULL)";
          out.args.push_back(bound);
        }
        bounds += ')';
      }
      if (!start.flag("exclusive")) {
        bounds += " OR (";
        for (size_t i = 0; i < ordering.size(); ++i) {
          if (i) bounds += " AND ";
          bounds += column(name, ordering[i].first, alias) + " IS ?";
          out.args.push_back(start.at("row").at(ordering[i].first));
        }
        bounds += ')';
      }
      out.sql += " AND (" + bounds + ")";
    }
    out.sql += " ORDER BY ";
    for (size_t i = 0; i < ordering.size(); ++i) {
      if (i) out.sql += ',';
      out.sql += column(name, ordering[i].first, alias) + " " + ordering[i].second;
    }
    if (ast.has("limit")) {
      out.sql += " LIMIT ?";
      out.args.push_back(static_cast<double>(integer(ast.at("limit"), "query limit")));
    }
    return out;
  }

  Json query(const Json& ast, const Json& format, const Json* correlation = nullptr,
             const Json* parent = nullptr, unsigned depth = 0) {
    if (depth > 32) throw std::runtime_error("relationship nesting exceeds 32 levels");
    auto compiled = compile(ast, "r", correlation, "", "", parent);
    Statement statement(db, compiled.sql);
    for (size_t i = 0; i < compiled.args.size(); ++i)
      statement.bind(static_cast<int>(i + 1), compiled.args[i]);
    Json::Array rows;
    while (statement.step()) {
      Json row = parse(db, statement.text(0));
      if (ast.has("related")) {
        for (const Json& related : ast.at("related").items()) {
          if (related.flag("hidden"))
            throw std::runtime_error("hidden relationships are not yet supported");
          const Json& child = related.at("subquery");
          std::string name =
              child.has("alias") ? child.at("alias").string() : child.at("table").string();
          const Json& childFormat = format.get("relationships").get(name);
          Json nested = query(child, childFormat, &related.at("correlation"), &row, depth + 1);
          std::get<Json::Object>(row.value).insert_or_assign(name, std::move(nested));
        }
      }
      rows.push_back(std::move(row));
      if (format.flag("singular")) break;
    }
    if (format.flag("singular")) return rows.empty() ? Json() : std::move(rows.front());
    return rows;
  }

  Json pending() {
    Statement statement(db, "SELECT id,name,args,timestamp FROM one_zero_mutations ORDER BY id");
    Json::Array result;
    while (statement.step())
      result.emplace_back(
          Json::Object{{"id", static_cast<double>(sqlite3_column_int64(statement.get(), 0))},
                       {"name", statement.text(1)},
                       {"args", parse(db, statement.text(2))},
                       {"timestamp", sqlite3_column_double(statement.get(), 3)},
                       {"clientID", clientID}});
    return result;
  }
  Json state() {
    return Json::Object{{"clientID", clientID},
                        {"clientGroupID", clientID},
                        {"cookie", meta("cookie")},
                        {"nextMutationID", meta("nextMutationID")},
                        {"lastMutationID", meta("lastMutationID")},
                        {"queryVersion", meta("queryVersion")},
                        {"queries", meta("queries")}};
  }
  void begin(const std::string& kind) {
    if (!transaction.empty()) throw std::runtime_error("a native transaction is already active");
    sql(db, "BEGIN IMMEDIATE");
    transaction = std::to_string(++nextTransaction);
    transactionKind = kind;
  }
  void guard(const Json& request) {
    if (transaction.empty()) {
      if (request.has("transaction")) throw std::runtime_error("native transaction has ended");
    } else if (!request.has("transaction") || request.at("transaction").string() != transaction)
      throw std::runtime_error("native transaction does not belong to this operation");
  }
  void rollback() {
    if (transaction.empty()) return;
    sql(db, "ROLLBACK");
    transaction.clear();
    transactionKind.clear();
  }
  Json execute(const Json& request) {
    if (!db) throw std::runtime_error("native Zero client is closed");
    std::string op = request.at("op").string();
    if (op == "beginMutation") {
      std::string name = request.at("name").string();
      if (name.empty()) throw std::runtime_error("mutation name is required");
      double timestamp = request.at("timestamp").number();
      begin("mutation");
      try {
        int64_t id = integer(meta("nextMutationID"), "mutation id");
        if (id >= 9007199254740991LL) throw std::runtime_error("mutation id exhausted");
        Json mutation = Json::Object{{"id", static_cast<double>(id)},
                                     {"name", name},
                                     {"args", request.at("args")},
                                     {"timestamp", timestamp},
                                     {"clientID", clientID}};
        sql(db, "INSERT INTO one_zero_mutations VALUES(?,?,?,?)",
            {static_cast<double>(id), name, request.at("args").dump(), timestamp});
        setMeta("nextMutationID", static_cast<double>(id + 1));
        return Json::Object{{"transaction", transaction}, {"mutation", mutation}};
      } catch (...) {
        rollback();
        throw;
      }
    }
    if (op == "beginPull") {
      const Json& response = request.at("response");
      if (response.has("error"))
        throw std::runtime_error("server rejected pull: " + response.at("error").dump());
      const Json& cookie = response.at("cookie");
      if (response.has("baseCookie") && response.at("baseCookie") != meta("cookie"))
        throw std::runtime_error("pull base cookie does not match persisted state");
      begin("pull");
      try {
        int64_t ack = integer(meta("lastMutationID"), "mutation acknowledgement");
        if (response.get("lastMutationIDChanges").has(clientID)) {
          int64_t incoming = integer(response.at("lastMutationIDChanges").at(clientID),
                                     "mutation acknowledgement");
          if (incoming < ack || incoming >= integer(meta("nextMutationID"), "next mutation id"))
            throw std::runtime_error("mutation acknowledgement is outside the client journal");
          ack = incoming;
        }
        sql(db, "DELETE FROM one_zero_mutations WHERE id<=?", {static_cast<double>(ack)});
        if (response.has("rowsPatch")) {
          for (const Json& patch : response.at("rowsPatch").items()) {
            std::string kind = patch.at("op").string();
            if (kind == "clear")
              sql(db, "DELETE FROM one_zero_base");
            else if (kind == "put" || kind == "del") {
              auto [name, row] = mapServerRow(patch.at("tableName").string(),
                                              patch.at(kind == "put" ? "value" : "id"));
              write("one_zero_base", kind == "put" ? "upsert" : "delete", name, row);
            } else if (kind == "update") {
              auto [name, id] = mapServerRow(patch.at("tableName").string(), patch.at("id"));
              Statement existing(db,
                                 "SELECT value FROM one_zero_base WHERE table_name=? AND key=?");
              existing.bind(1, name);
              existing.bind(2, key(name, id));
              if (!existing.step()) throw std::runtime_error("row patch updates an absent row");
              Json row = parse(db, existing.text(0));
              if (patch.has("merge")) {
                auto [unused, merge] =
                    mapServerRow(patch.at("tableName").string(), patch.at("merge"));
                for (const auto& [column, value] : merge.fields())
                  std::get<Json::Object>(row.value).insert_or_assign(column, value);
              }
              if (patch.has("constrain") && !patch.at("constrain").items().empty()) {
                std::set<std::string> keep;
                for (const auto& field : patch.at("constrain").items()) {
                  auto mapped = table(name).serverColumns.find(field.string());
                  if (mapped == table(name).serverColumns.end())
                    throw std::runtime_error("unknown constrained column");
                  keep.insert(mapped->second);
                }
                auto& fields = std::get<Json::Object>(row.value);
                for (auto it = fields.begin(); it != fields.end();) {
                  if (!keep.contains(it->first))
                    it = fields.erase(it);
                  else
                    ++it;
                }
              }
              write("one_zero_base", "upsert", name, row);
            } else
              throw std::runtime_error("unsupported row patch: " + kind);
          }
        }
        sql(db, "DELETE FROM one_zero_view");
        sql(db, "INSERT INTO one_zero_view SELECT * FROM one_zero_base");
        setMeta("cookie", cookie);
        setMeta("lastMutationID", static_cast<double>(ack));
        return Json::Object{{"transaction", transaction}, {"pending", pending()}};
      } catch (...) {
        rollback();
        throw;
      }
    }
    guard(request);
    if (op == "setQueries") {
      if (request.has("queries")) {
        std::set<std::string> hashes;
        for (const auto& desired : request.at("queries").items()) {
          auto hash = desired.at("hash").string();
          if (hash.empty() || !hashes.insert(hash).second)
            throw std::runtime_error("desired queries require distinct nonempty hashes");
          if (desired.has("ast") == desired.has("name"))
            throw std::runtime_error("desired query requires either an AST or a name");
          if (desired.has("name")) {
            desired.at("name").string();
            desired.at("args").items();
          } else
            compile(desired.at("ast"), "r");
        }
      }
      begin("queries");
      try {
        auto version = integer(meta("queryVersion"), "desired query version");
        if (version >= 9007199254740991LL)
          throw std::runtime_error("desired query version exhausted");
        setMeta("queryVersion", static_cast<double>(version + 1));
        if (request.has("queries")) setMeta("queries", request.at("queries"));
        sql(db, "COMMIT");
        transaction.clear();
        transactionKind.clear();
        return state();
      } catch (...) {
        rollback();
        throw;
      }
    }
    if (op == "query") return query(request.at("ast"), request.get("format"));
    if (op == "state") return state();
    if (op == "pending") return pending();
    if (op == "rollback") {
      rollback();
      return Json();
    }
    if (op == "write") {
      if (transaction.empty())
        throw std::runtime_error("writes require an active native transaction");
      write("one_zero_view", request.at("kind").string(), request.at("table").string(),
            request.at("value"));
      return Json();
    }
    if (op == "commitMutation" || op == "commitPull") {
      if (transaction.empty() || transactionKind != (op == "commitMutation" ? "mutation" : "pull"))
        throw std::runtime_error("wrong native transaction kind");
      sql(db, "COMMIT");
      transaction.clear();
      transactionKind.clear();
      return state();
    }
    throw std::runtime_error("unsupported native Zero operation: " + op);
  }
};

Client::Client(const std::string& path, const std::string& schema, const std::string& clientID)
    : impl_(std::make_unique<Impl>(path, schema, clientID)) {}
Client::~Client() = default;
std::string Client::execute(const std::string& request) {
  std::lock_guard<std::mutex> lock(impl_->mutex);
  if (!impl_->db) throw std::runtime_error("native Zero client is closed");
  return impl_->execute(parse(impl_->db, request)).dump();
}
void Client::close() {
  std::lock_guard<std::mutex> lock(impl_->mutex);
  if (!impl_->db) return;
  impl_->rollback();
  int result = sqlite3_close(impl_->db);
  if (result != SQLITE_OK) throw std::runtime_error(sqlite3_errmsg(impl_->db));
  impl_->db = nullptr;
}

}
