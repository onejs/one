#include "OneLinuxNetwork.h"

#include <libsoup/soup.h>

#include <atomic>
#include <map>
#include <vector>

#include "OneLinuxRuntime.h"

namespace facebook::react {

namespace {

// one session on the main context; every request starts and finishes there
SoupSession *session()
{
  static SoupSession *shared = soup_session_new();
  return shared;
}

struct FetchState {
  SoupMessage *message;
  std::function<void(const std::string &, const std::string &)> done;
};

void fetchFinished(GObject *, GAsyncResult *result, gpointer data)
{
  std::unique_ptr<FetchState> state(static_cast<FetchState *>(data));
  GError *error = nullptr;
  GBytes *bytes = soup_session_send_and_read_finish(session(), result, &error);
  if (!bytes) {
    bool cancelled = g_error_matches(error, G_IO_ERROR, G_IO_ERROR_CANCELLED);
    std::string message = error->message;
    g_error_free(error);
    g_object_unref(state->message);
    if (!cancelled) {
      state->done({}, message);
    }
    return;
  }
  guint status = soup_message_get_status(state->message);
  gsize length = 0;
  const char *body = static_cast<const char *>(g_bytes_get_data(bytes, &length));
  std::string text(body, length);
  g_bytes_unref(bytes);
  g_object_unref(state->message);
  if (status != SOUP_STATUS_OK) {
    state->done({}, "HTTP " + std::to_string(status) + ": " + text.substr(0, 400));
    return;
  }
  state->done(text, {});
}

class WebSockets;

// a websocket the module owns until it closes. main thread only
struct Socket {
  int id;
  SoupWebsocketConnection *connection{nullptr};
  GCancellable *cancellable{g_cancellable_new()};
  std::function<void(const std::string &, folly::dynamic)> emit;
  std::weak_ptr<WebSockets> owner;

  ~Socket()
  {
    g_cancellable_cancel(cancellable);
    g_object_unref(cancellable);
    if (connection) {
      g_signal_handlers_disconnect_by_data(connection, this);
      if (soup_websocket_connection_get_state(connection) == SOUP_WEBSOCKET_STATE_OPEN) {
        soup_websocket_connection_close(connection, SOUP_WEBSOCKET_CLOSE_GOING_AWAY, nullptr);
      }
      g_object_unref(connection);
    }
  }
};

class WebSockets : public std::enable_shared_from_this<WebSockets> {
 public:
  explicit WebSockets(std::function<void(const std::string &, folly::dynamic)> emit) : emit_(std::move(emit)) {}

  // sockets belong to the main thread, so they are released there
  ~WebSockets()
  {
    auto sockets = std::make_shared<decltype(sockets_)>(std::move(sockets_));
    OneLinuxDispatchMain([sockets] { sockets->clear(); });
  }

  void connect(std::string url, std::vector<std::string> protocols, int id)
  {
    OneLinuxDispatchMain([weak = weak_from_this(), url = std::move(url), protocols = std::move(protocols), id] {
      if (auto self = weak.lock()) {
        self->connectOnMain(url, protocols, id);
      }
    });
  }

  void sendText(std::string text, int id)
  {
    OneLinuxDispatchMain([weak = weak_from_this(), text = std::move(text), id] {
      if (auto self = weak.lock()) {
        if (Socket *socket = self->find(id)) {
          soup_websocket_connection_send_text(socket->connection, text.c_str());
        }
      }
    });
  }

  void sendBase64(std::string base64, int id)
  {
    OneLinuxDispatchMain([weak = weak_from_this(), base64 = std::move(base64), id] {
      if (auto self = weak.lock()) {
        if (Socket *socket = self->find(id)) {
          gsize length = 0;
          guchar *data = g_base64_decode(base64.c_str(), &length);
          soup_websocket_connection_send_binary(socket->connection, data, length);
          g_free(data);
        }
      }
    });
  }

  void close(int id, int code, std::string reason)
  {
    OneLinuxDispatchMain([weak = weak_from_this(), id, code, reason = std::move(reason)] {
      if (auto self = weak.lock()) {
        auto it = self->sockets_.find(id);
        if (it == self->sockets_.end()) {
          return;
        }
        if (it->second->connection) {
          soup_websocket_connection_close(it->second->connection, code, reason.c_str());
        } else {
          self->sockets_.erase(it);
        }
      }
    });
  }

 private:
  struct Pending {
    std::weak_ptr<WebSockets> owner;
    int id;
  };

  Socket *find(int id)
  {
    auto it = sockets_.find(id);
    return it != sockets_.end() && it->second->connection ? it->second.get() : nullptr;
  }

  std::unique_ptr<Socket> removeClosed(Socket *socket)
  {
    auto it = sockets_.find(socket->id);
    if (it == sockets_.end() || it->second.get() != socket) {
      return {};
    }
    auto closed = std::move(it->second);
    sockets_.erase(it);
    return closed;
  }

  void connectOnMain(const std::string &url, const std::vector<std::string> &protocols, int id)
  {
    SoupMessage *message = soup_message_new(SOUP_METHOD_GET, url.c_str());
    if (!message) {
      emit_("websocketFailed", folly::dynamic::object("id", id)("message", "invalid url " + url));
      return;
    }
    std::vector<char *> list;
    for (const auto &protocol : protocols) {
      list.push_back(const_cast<char *>(protocol.c_str()));
    }
    list.push_back(nullptr);

    auto socket = std::make_unique<Socket>();
    socket->id = id;
    socket->emit = emit_;
    socket->owner = weak_from_this();
    GCancellable *cancellable = socket->cancellable;
    sockets_[id] = std::move(socket);
    soup_session_websocket_connect_async(
        session(),
        message,
        nullptr,
        protocols.empty() ? nullptr : list.data(),
        G_PRIORITY_DEFAULT,
        cancellable,
        [](GObject *, GAsyncResult *result, gpointer data) {
          std::unique_ptr<Pending> pending(static_cast<Pending *>(data));
          GError *error = nullptr;
          SoupWebsocketConnection *connection = soup_session_websocket_connect_finish(session(), result, &error);
          auto owner = pending->owner.lock();
          if (!connection) {
            bool cancelled = g_error_matches(error, G_IO_ERROR, G_IO_ERROR_CANCELLED);
            std::string text = error->message;
            g_error_free(error);
            if (owner && !cancelled) {
              owner->emit_("websocketFailed", folly::dynamic::object("id", pending->id)("message", text));
              owner->sockets_.erase(pending->id);
            }
            return;
          }
          if (!owner || owner->sockets_.find(pending->id) == owner->sockets_.end()) {
            g_object_unref(connection);
            return;
          }
          owner->opened(*owner->sockets_[pending->id], connection);
        },
        new Pending{weak_from_this(), id});
    g_object_unref(message);
  }

  void opened(Socket &socket, SoupWebsocketConnection *connection)
  {
    socket.connection = connection;
    // the dev server sends Fast Refresh updates in frames far over libsoup's default limit
    soup_websocket_connection_set_max_incoming_payload_size(connection, 64 * 1024 * 1024);
    g_signal_connect(connection, "message", G_CALLBACK(+[](SoupWebsocketConnection *, gint type, GBytes *bytes, gpointer data) {
      auto *self = static_cast<Socket *>(data);
      gsize length = 0;
      const char *body = static_cast<const char *>(g_bytes_get_data(bytes, &length));
      if (type == SOUP_WEBSOCKET_DATA_TEXT) {
        self->emit(
            "websocketMessage",
            folly::dynamic::object("id", self->id)("type", "text")("data", std::string(body, length)));
      } else {
        gchar *encoded = g_base64_encode(reinterpret_cast<const guchar *>(body), length);
        self->emit("websocketMessage", folly::dynamic::object("id", self->id)("type", "binary")("data", std::string(encoded)));
        g_free(encoded);
      }
    }), &socket);
    g_signal_connect(connection, "error", G_CALLBACK(+[](SoupWebsocketConnection *, GError *error, gpointer data) {
      auto *self = static_cast<Socket *>(data);
      self->emit("websocketFailed", folly::dynamic::object("id", self->id)("message", std::string(error->message)));
    }), &socket);
    g_signal_connect(connection, "closed", G_CALLBACK(+[](SoupWebsocketConnection *connection, gpointer data) {
      auto *self = static_cast<Socket *>(data);
      auto owner = self->owner.lock();
      if (!owner) {
        return;
      }
      // remove the registry entry now; keep its objects until this callback ends
      auto closed = owner->removeClosed(self);
      if (!closed) {
        return;
      }
      closed->emit(
          "websocketClosed",
          folly::dynamic::object("id", closed->id)("code", static_cast<int>(soup_websocket_connection_get_close_code(connection)))(
              "reason", soup_websocket_connection_get_close_data(connection) ? soup_websocket_connection_get_close_data(connection) : ""));
    }), &socket);
    const char *protocol = soup_websocket_connection_get_protocol(connection);
    socket.emit("websocketOpen", folly::dynamic::object("id", socket.id)("protocol", protocol ? protocol : ""));
  }

  std::function<void(const std::string &, folly::dynamic)> emit_;
  std::map<int, std::unique_ptr<Socket>> sockets_;
};

// XMLHttpRequest and fetch requests on libsoup. Responses arrive whole, so
// incremental updates and blob responses are not provided. Main thread only.
class HttpRequests : public std::enable_shared_from_this<HttpRequests> {
 public:
  explicit HttpRequests(std::function<void(const std::string &, folly::dynamic)> emit) : emit_(std::move(emit)) {}

  ~HttpRequests()
  {
    auto pending = std::make_shared<decltype(pending_)>(std::move(pending_));
    OneLinuxDispatchMain([pending] {
      for (auto &entry : *pending) {
        g_cancellable_cancel(entry.second);
        g_object_unref(entry.second);
      }
    });
  }

  int nextId() { return ++nextId_; }

  void send(int id, folly::dynamic query)
  {
    OneLinuxDispatchMain([weak = weak_from_this(), id, query = std::move(query)] {
      if (auto self = weak.lock()) {
        self->sendOnMain(id, query);
      }
    });
  }

  void abort(int id)
  {
    OneLinuxDispatchMain([weak = weak_from_this(), id] {
      if (auto self = weak.lock()) {
        auto it = self->pending_.find(id);
        if (it != self->pending_.end()) {
          g_cancellable_cancel(it->second);
        }
      }
    });
  }

 private:
  struct Request {
    std::weak_ptr<HttpRequests> owner;
    int id;
    SoupMessage *message;
    std::string responseType;
  };

  void complete(int id, const folly::dynamic &error, bool timedOut)
  {
    emit_("didCompleteNetworkResponse", folly::dynamic::array(id, error, timedOut));
  }

  void sendOnMain(int id, const folly::dynamic &query)
  {
    std::string url = query.getDefault("url", "").asString();
    std::string type = query.getDefault("responseType", "text").asString();
    SoupMessage *message = nullptr;
    if (url.rfind("http://", 0) == 0 || url.rfind("https://", 0) == 0) {
      message = soup_message_new(query.getDefault("method", "GET").asString().c_str(), url.c_str());
    }
    if (!message) {
      complete(id, "Invalid HTTP URL", false);
      return;
    }
    if (type != "text" && type != "base64") {
      g_object_unref(message);
      complete(id, "Unsupported networking response type", false);
      return;
    }
    SoupMessageHeaders *headers = soup_message_get_request_headers(message);
    if (auto it = query.find("headers"); it != query.items().end() && it->second.isObject()) {
      for (const auto &header : it->second.items()) {
        soup_message_headers_replace(headers, header.first.asString().c_str(), header.second.asString().c_str());
      }
    }
    if (auto it = query.find("data"); it != query.items().end() && it->second.isObject()) {
      const auto &body = it->second;
      GBytes *bytes = nullptr;
      if (auto text = body.find("string"); text != body.items().end() && text->second.isString()) {
        bytes = g_bytes_new(text->second.getString().data(), text->second.getString().size());
      } else if (auto data = body.find("base64"); data != body.items().end() && data->second.isString()) {
        gsize length = 0;
        guchar *decoded = g_base64_decode(data->second.getString().c_str(), &length);
        bytes = g_bytes_new_take(decoded, length);
      } else if (body.find("blob") != body.items().end() || body.find("uri") != body.items().end() ||
                 body.find("formData") != body.items().end()) {
        g_object_unref(message);
        complete(id, "Unsupported networking request body", false);
        return;
      }
      if (bytes) {
        const char *contentType = soup_message_headers_get_one(headers, "Content-Type");
        soup_message_set_request_body_from_bytes(message, contentType, bytes);
        g_bytes_unref(bytes);
      }
    }
    GCancellable *cancellable = g_cancellable_new();
    pending_[id] = cancellable;
    soup_session_send_and_read_async(
        session(), message, G_PRIORITY_DEFAULT, cancellable,
        [](GObject *, GAsyncResult *result, gpointer data) {
          std::unique_ptr<Request> request(static_cast<Request *>(data));
          GError *error = nullptr;
          GBytes *bytes = soup_session_send_and_read_finish(session(), result, &error);
          auto owner = request->owner.lock();
          if (owner) {
            if (auto it = owner->pending_.find(request->id); it != owner->pending_.end()) {
              g_object_unref(it->second);
              owner->pending_.erase(it);
            }
          }
          if (owner && bytes) {
            owner->finish(*request, bytes);
          } else if (owner) {
            bool timedOut = g_error_matches(error, G_IO_ERROR, G_IO_ERROR_TIMED_OUT);
            owner->complete(request->id, error->message, timedOut);
          }
          if (error) {
            g_error_free(error);
          }
          if (bytes) {
            g_bytes_unref(bytes);
          }
          g_object_unref(request->message);
        },
        new Request{weak_from_this(), id, message, type});
  }

  void finish(const Request &request, GBytes *bytes)
  {
    SoupMessage *message = request.message;
    folly::dynamic headers = folly::dynamic::object();
    soup_message_headers_foreach(
        soup_message_get_response_headers(message),
        [](const char *name, const char *value, gpointer data) {
          auto &map = *static_cast<folly::dynamic *>(data);
          map[name] = value;
        },
        &headers);
    GUri *uri = soup_message_get_uri(message);
    gchar *responseUrl = g_uri_to_string(uri);
    emit_(
        "didReceiveNetworkResponse",
        folly::dynamic::array(request.id, static_cast<int>(soup_message_get_status(message)), std::move(headers), std::string(responseUrl)));
    g_free(responseUrl);
    gsize length = 0;
    const char *body = static_cast<const char *>(g_bytes_get_data(bytes, &length));
    if (request.responseType == "base64") {
      gchar *encoded = g_base64_encode(reinterpret_cast<const guchar *>(body), length);
      emit_("didReceiveNetworkData", folly::dynamic::array(request.id, std::string(encoded)));
      g_free(encoded);
      complete(request.id, nullptr, false);
    } else if (g_utf8_validate(body, length, nullptr)) {
      emit_("didReceiveNetworkData", folly::dynamic::array(request.id, std::string(body, length)));
      complete(request.id, nullptr, false);
    } else {
      complete(request.id, "Response text could not be decoded", false);
    }
  }

  std::function<void(const std::string &, folly::dynamic)> emit_;
  std::map<int, GCancellable *> pending_;
  std::atomic<int> nextId_{0};
};

} // namespace

GCancellable *OneLinuxFetchScript(
    const std::string &url,
    std::function<void(const std::string &, const std::string &)> done)
{
  GCancellable *cancellable = g_cancellable_new();
  SoupMessage *message = soup_message_new(SOUP_METHOD_GET, url.c_str());
  if (!message) {
    done({}, "invalid url " + url);
    return cancellable;
  }
  soup_session_send_and_read_async(
      session(), message, G_PRIORITY_DEFAULT, cancellable, fetchFinished, new FetchState{message, std::move(done)});
  return cancellable;
}

std::shared_ptr<OneHostModule> OneLinuxCreateWebSocketModule(
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("WebSocketModule", std::move(jsInvoker));
  auto sockets = std::make_shared<WebSockets>(context.emitDeviceEvent);

  module->method("connect", 4, [sockets](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    std::vector<std::string> protocols;
    if (count > 1 && args[1].isObject() && args[1].getObject(rt).isArray(rt)) {
      auto list = args[1].getObject(rt).getArray(rt);
      for (size_t i = 0; i < list.size(rt); i++) {
        protocols.push_back(list.getValueAtIndex(rt, i).getString(rt).utf8(rt));
      }
    }
    sockets->connect(stringArg(rt, args, count, 0), std::move(protocols), static_cast<int>(numberArg(args, count, 3)));
    return jsi::Value::undefined();
  });
  module->method("send", 2, [sockets](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    sockets->sendText(stringArg(rt, args, count, 0), static_cast<int>(numberArg(args, count, 1)));
    return jsi::Value::undefined();
  });
  module->method("sendBinary", 2, [sockets](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    sockets->sendBase64(stringArg(rt, args, count, 0), static_cast<int>(numberArg(args, count, 1)));
    return jsi::Value::undefined();
  });
  module->noop("ping");
  module->method("close", 3, [sockets](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    sockets->close(
        static_cast<int>(numberArg(args, count, 2)),
        static_cast<int>(numberArg(args, count, 0)),
        stringArg(rt, args, count, 1));
    return jsi::Value::undefined();
  });
  addEventEmitterStubs(*module);
  return module;
}

std::shared_ptr<OneHostModule> OneLinuxCreateNetworkingModule(
    std::shared_ptr<CallInvoker> jsInvoker,
    const OneHostModuleContext &context)
{
  auto module = std::make_shared<OneHostModule>("Networking", std::move(jsInvoker));
  auto requests = std::make_shared<HttpRequests>(context.emitDeviceEvent);
  addEventEmitterStubs(*module);
  module->method("sendRequest", 2, [requests](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count < 2) {
      throw jsi::JSError(rt, "Networking.sendRequest requires a query and callback");
    }
    folly::dynamic query = jsi::dynamicFromValue(rt, args[0]);
    int id = requests->nextId();
    args[1].getObject(rt).getFunction(rt).call(rt, static_cast<double>(id));
    requests->send(id, std::move(query));
    return jsi::Value::undefined();
  });
  module->method("abortRequest", 1, [requests](jsi::Runtime &, const jsi::Value *args, size_t count) {
    requests->abort(static_cast<int>(numberArg(args, count, 0)));
    return jsi::Value::undefined();
  });
  module->method("clearCookies", 1, [](jsi::Runtime &rt, const jsi::Value *args, size_t count) {
    if (count) {
      args[0].getObject(rt).getFunction(rt).call(rt, false);
    }
    return jsi::Value::undefined();
  });
  return module;
}

} // namespace facebook::react
