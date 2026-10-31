#include "OneLinuxOpSqlite.h"

#include <glib.h>
#include <glib/gstdio.h>

#include "OPSqlite.hpp"

#include <atomic>
#include <string>

namespace facebook::react {

namespace {

std::string dataDirectory()
{
  std::string path = std::string(g_get_user_data_dir()) + "/one";
  g_mkdir_with_parents(path.c_str(), 0755);
  return path;
}

class OpSqliteModule : public TurboModule {
 public:
  OpSqliteModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker)
      : TurboModule("OPSQLite", jsInvoker), runtime_(runtime), jsInvoker_(std::move(jsInvoker))
  {
  }

  ~OpSqliteModule() override
  {
    if (generationAlive_) {
      opsqlite::invalidate(generationAlive_);
    }
  }

  jsi::Value create(jsi::Runtime &rt, const jsi::PropNameID &propName) override
  {
    auto name = propName.utf8(rt);
    if (name == "getConstants") {
      return method(rt, propName, 0, [](jsi::Runtime &r, const jsi::Value *, size_t) {
        jsi::Object constants(r);
        auto directory = jsi::String::createFromUtf8(r, dataDirectory());
        constants.setProperty(r, "IOS_DOCUMENT_PATH", directory);
        constants.setProperty(r, "IOS_LIBRARY_PATH", directory);
        return jsi::Value(std::move(constants));
      });
    }
    if (name == "install") {
      return method(rt, propName, 0, [this](jsi::Runtime &, const jsi::Value *, size_t) {
        generationAlive_ = opsqlite::install(runtime_, jsInvoker_, dataDirectory().c_str(), "");
        return jsi::Value(true);
      });
    }
    return jsi::Value::undefined();
  }

 private:
  template <typename Fn>
  static jsi::Value method(jsi::Runtime &rt, const jsi::PropNameID &name, unsigned argCount, Fn fn)
  {
    return jsi::Function::createFromHostFunction(
        rt, name, argCount, [fn](jsi::Runtime &r, const jsi::Value &, const jsi::Value *args, size_t count) {
          return fn(r, args, count);
        });
  }

  jsi::Runtime &runtime_;
  std::shared_ptr<CallInvoker> jsInvoker_;
  std::shared_ptr<std::atomic<bool>> generationAlive_;
};

} // namespace

std::shared_ptr<TurboModule> OneLinuxCreateOpSqliteModule(jsi::Runtime &runtime, std::shared_ptr<CallInvoker> jsInvoker)
{
  return std::make_shared<OpSqliteModule>(runtime, std::move(jsInvoker));
}

} // namespace facebook::react
