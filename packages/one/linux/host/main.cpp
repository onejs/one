#include <gtk/gtk.h>
#include <limits.h>
#include <unistd.h>

#include <memory>
#include <string>

#include "OneLinuxHost.h"
#include "OneLinuxStartup.h"
#include "OneLinuxView.h"

using facebook::react::OneLinuxHost;

namespace {

struct App {
  std::string bundlePath;
  std::unique_ptr<OneLinuxHost> host;
};

// main.jsbundle sits beside the executable unless a path is given
std::string defaultBundlePath()
{
  char executable[PATH_MAX];
  ssize_t length = readlink("/proc/self/exe", executable, sizeof(executable) - 1);
  std::string path(executable, length > 0 ? length : 0);
  return path.substr(0, path.rfind('/') + 1) + "main.jsbundle";
}

void surfaceChanged(double width, double height, double scale, gpointer data)
{
  static_cast<App *>(data)->host->updateLayout(width, height, scale);
}

void activate(GtkApplication *application, gpointer data)
{
  auto *app = static_cast<App *>(data);
  OneLinuxStartupMark("gtk activate");

  GtkWidget *window = gtk_application_window_new(application);
  gtk_window_set_title(GTK_WINDOW(window), "One");
  gtk_window_set_default_size(GTK_WINDOW(window), 800, 600);

  OneView *surface = one_view_new();
  one_view_make_surface(surface, surfaceChanged, app);
  gtk_window_set_child(GTK_WINDOW(window), GTK_WIDGET(surface));

  app->host = std::make_unique<OneLinuxHost>(app->bundlePath, "main", surface);
  // the first allocation reports the window size; start once it is known
  gtk_window_present(GTK_WINDOW(window));
  app->host->start();
  OneLinuxStartupMark("window presented, react started");
}

void shutdown(GApplication *, gpointer data)
{
  static_cast<App *>(data)->host.reset();
}

} // namespace

int main(int argc, char **argv)
{
  OneLinuxStartupMark("main");
  App app;
  app.bundlePath = argc > 1 ? argv[1] : defaultBundlePath();

  GtkApplication *application = gtk_application_new("dev.onestack.OneLinux", G_APPLICATION_NON_UNIQUE);
  g_signal_connect(application, "activate", G_CALLBACK(activate), &app);
  g_signal_connect(application, "shutdown", G_CALLBACK(shutdown), &app);
  int status = g_application_run(G_APPLICATION(application), 1, argv);
  g_object_unref(application);
  return status;
}
