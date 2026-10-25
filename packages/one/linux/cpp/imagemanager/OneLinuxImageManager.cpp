#include <react/renderer/imagemanager/ImageManager.h>
#include <react/renderer/imagemanager/ImageResponse.h>
#include <react/renderer/imagemanager/ImageTelemetry.h>

#include <gdk/gdk.h>
#include <libsoup/soup.h>

#include <string>

using namespace facebook::react;

// The host's ImageManager: loads http(s), file and data URIs and hands the
// decoded GdkTexture to the request's observers on the main thread. The cxx
// stub that ships with react-native is left out of the core build.

namespace {

struct Load {
  ImageSource source;
  std::weak_ptr<const ImageResponseObserverCoordinator> coordinator;
  GCancellable *cancellable{nullptr};

  ~Load()
  {
    if (cancellable) {
      g_cancellable_cancel(cancellable);
      g_object_unref(cancellable);
    }
  }
};

using LoadPointer = std::shared_ptr<Load>;

SoupSession *session()
{
  static SoupSession *shared = soup_session_new();
  return shared;
}

void fail(const LoadPointer &load, const std::string &message)
{
  if (auto coordinator = load->coordinator.lock()) {
    coordinator->nativeImageResponseFailed(ImageLoadError(std::make_shared<std::string>(message)));
  }
}

void decodeInThread(GTask *task, gpointer, gpointer data, GCancellable *)
{
  GError *error = nullptr;
  GdkTexture *texture = gdk_texture_new_from_bytes(static_cast<GBytes *>(data), &error);
  if (texture) {
    g_task_return_pointer(task, texture, g_object_unref);
  } else {
    g_task_return_error(task, error);
  }
}

void decoded(GObject *, GAsyncResult *result, gpointer data)
{
  auto *load = static_cast<LoadPointer *>(data);
  GError *error = nullptr;
  auto *texture = static_cast<GdkTexture *>(g_task_propagate_pointer(G_TASK(result), &error));
  if (texture) {
    if (auto coordinator = (*load)->coordinator.lock()) {
      std::shared_ptr<void> holder(texture, [](void *pointer) { g_object_unref(pointer); });
      coordinator->nativeImageResponseComplete(ImageResponse(holder, nullptr));
    } else {
      g_object_unref(texture);
    }
  } else {
    if (!g_error_matches(error, G_IO_ERROR, G_IO_ERROR_CANCELLED)) {
      fail(*load, "image could not be decoded: " + std::string(error->message));
    }
    g_error_free(error);
  }
  delete load;
}

// takes the bytes; decoding runs off the main thread
void decode(const LoadPointer &load, GBytes *bytes)
{
  GTask *task = g_task_new(nullptr, load->cancellable, decoded, new LoadPointer(load));
  g_task_set_task_data(task, bytes, reinterpret_cast<GDestroyNotify>(g_bytes_unref));
  g_task_run_in_thread(task, decodeInThread);
  g_object_unref(task);
}

void loadedFile(GObject *source, GAsyncResult *result, gpointer data)
{
  auto *load = static_cast<LoadPointer *>(data);
  GError *error = nullptr;
  GBytes *bytes = g_file_load_bytes_finish(G_FILE(source), result, nullptr, &error);
  if (bytes) {
    decode(*load, bytes);
  } else {
    if (!g_error_matches(error, G_IO_ERROR, G_IO_ERROR_CANCELLED)) {
      fail(*load, error->message);
    }
    g_error_free(error);
  }
  delete load;
}

void receivedBody(GObject *, GAsyncResult *result, gpointer data)
{
  auto *state = static_cast<std::pair<LoadPointer, SoupMessage *> *>(data);
  GError *error = nullptr;
  GBytes *bytes = soup_session_send_and_read_finish(session(), result, &error);
  if (bytes && SOUP_STATUS_IS_SUCCESSFUL(soup_message_get_status(state->second))) {
    decode(state->first, bytes);
  } else if (bytes) {
    g_bytes_unref(bytes);
    fail(state->first, "HTTP " + std::to_string(soup_message_get_status(state->second)));
  } else {
    if (!g_error_matches(error, G_IO_ERROR, G_IO_ERROR_CANCELLED)) {
      fail(state->first, error->message);
    }
    g_error_free(error);
  }
  g_object_unref(state->second);
  delete state;
}

bool startsWith(const std::string &text, const char *prefix)
{
  return text.rfind(prefix, 0) == 0;
}

gboolean begin(gpointer data)
{
  auto *loadPointer = static_cast<LoadPointer *>(data);
  const LoadPointer &load = *loadPointer;
  const std::string &uri = load->source.uri;
  // a request already running, or one that finished, has nothing to resume
  if (!load->cancellable) {
    load->cancellable = g_cancellable_new();
    if (startsWith(uri, "http://") || startsWith(uri, "https://")) {
      SoupMessage *message = soup_message_new(load->source.method.empty() ? SOUP_METHOD_GET : load->source.method.c_str(), uri.c_str());
      if (!message) {
        fail(load, "invalid image uri");
      } else {
        for (const auto &header : load->source.headers) {
          soup_message_headers_replace(soup_message_get_request_headers(message), header.first.c_str(), header.second.c_str());
        }
        soup_session_send_and_read_async(
            session(), message, G_PRIORITY_DEFAULT, load->cancellable, receivedBody, new std::pair<LoadPointer, SoupMessage *>(load, message));
      }
    } else if (startsWith(uri, "data:")) {
      size_t comma = uri.find(',');
      bool base64 = comma != std::string::npos && uri.substr(0, comma).find(";base64") != std::string::npos;
      if (comma == std::string::npos) {
        fail(load, "invalid data uri");
      } else if (base64) {
        gsize length = 0;
        guchar *bytes = g_base64_decode(uri.c_str() + comma + 1, &length);
        decode(load, g_bytes_new_take(bytes, length));
      } else {
        gchar *text = g_uri_unescape_string(uri.c_str() + comma + 1, nullptr);
        decode(load, g_bytes_new_take(text, strlen(text)));
      }
    } else if (startsWith(uri, "file://") || startsWith(uri, "/")) {
      GFile *file = startsWith(uri, "/") ? g_file_new_for_path(uri.c_str()) : g_file_new_for_uri(uri.c_str());
      g_file_load_bytes_async(file, load->cancellable, loadedFile, new LoadPointer(load));
      g_object_unref(file);
    } else {
      fail(load, "unsupported image uri " + uri);
    }
  }
  delete loadPointer;
  return G_SOURCE_REMOVE;
}

gboolean cancel(gpointer data)
{
  auto *loadPointer = static_cast<LoadPointer *>(data);
  if ((*loadPointer)->cancellable) {
    g_cancellable_cancel((*loadPointer)->cancellable);
    g_object_unref((*loadPointer)->cancellable);
    (*loadPointer)->cancellable = nullptr;
  }
  delete loadPointer;
  return G_SOURCE_REMOVE;
}

// requests start from the layout thread; GLib sources attach to the main context
void onMain(GSourceFunc function, const LoadPointer &load)
{
  g_main_context_invoke(nullptr, function, new LoadPointer(load));
}

} // namespace

ImageManager::ImageManager(const std::shared_ptr<const ContextContainer> &) {}

ImageManager::~ImageManager() {}

ImageRequest ImageManager::requestImage(
    const ImageSource &imageSource, SurfaceId surfaceId, const ImageRequestParams &, Tag) const
{
  auto telemetry = std::make_shared<ImageTelemetry>(surfaceId);
  if (imageSource.type == ImageSource::Type::Invalid || imageSource.uri.empty()) {
    return {imageSource, telemetry, {}};
  }

  auto load = std::make_shared<Load>();
  load->source = imageSource;
  SharedFunction<> resume([load] { onMain(begin, load); });
  SharedFunction<> cancelRequest([load] { onMain(cancel, load); });
  ImageRequest request(imageSource, telemetry, std::move(resume), std::move(cancelRequest));
  load->coordinator = request.getSharedObserverCoordinator();
  onMain(begin, load);
  return request;
}
