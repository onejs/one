import android.content.ClipData;
import android.os.IBinder;
import java.lang.reflect.Method;

// sets or reads the device clipboard from outside any app, over the
// clipboard binder directly, so the conformance suite can prove the app
// reads a value it did not write. usage: set <text> | get
public class SetDeviceClipboard {
  private static Object clipboard() throws Exception {
    Class<?> serviceManager = Class.forName("android.os.ServiceManager");
    Method getService = serviceManager.getMethod("getService", String.class);
    IBinder binder = (IBinder) getService.invoke(null, "clipboard");
    Class<?> stub = Class.forName("android.content.IClipboard$Stub");
    return stub.getMethod("asInterface", IBinder.class).invoke(null, binder);
  }

  // setPrimaryClip/getPrimaryClip gained callingPackage, attributionTag and
  // userId parameters across releases; fill by type so one binary fits all.
  private static Object call(Object target, String name, ClipData clip) throws Exception {
    Method match = null;
    for (Method method : target.getClass().getMethods()) {
      if (method.getName().equals(name)) match = method;
    }
    if (match == null) throw new NoSuchMethodException(name);
    Class<?>[] types = match.getParameterTypes();
    Object[] args = new Object[types.length];
    int strings = 0;
    for (int i = 0; i < types.length; i++) {
      if (types[i] == ClipData.class) args[i] = clip;
      else if (types[i] == String.class) args[i] = (strings++ == 0) ? "com.android.shell" : null;
      else if (types[i] == int.class || types[i] == Integer.class) args[i] = 0;
      else if (types[i] == long.class || types[i] == Long.class) args[i] = 0L;
      else if (types[i] == boolean.class || types[i] == Boolean.class) args[i] = false;
      else throw new IllegalArgumentException("unsupported " + name + " param " + types[i]);
    }
    return match.invoke(target, args);
  }

  public static void main(String[] args) throws Exception {
    if (args.length == 0) throw new IllegalArgumentException("usage: set <text> | get");
    Object clipboard = clipboard();
    if (args[0].equals("set")) {
      if (args.length != 2) throw new IllegalArgumentException("usage: set <text>");
      call(clipboard, "setPrimaryClip", ClipData.newPlainText("text", args[1]));
      System.out.println("set ok");
    } else if (args[0].equals("get")) {
      ClipData clip = (ClipData) call(clipboard, "getPrimaryClip", null);
      String text = "";
      if (clip != null && clip.getItemCount() > 0 && clip.getItemAt(0).getText() != null) {
        text = clip.getItemAt(0).getText().toString();
      }
      System.out.println("clip:" + text);
    } else {
      throw new IllegalArgumentException("usage: set <text> | get");
    }
  }
}
