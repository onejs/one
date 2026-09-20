#include <fbjni/fbjni.h>
#include <jni.h>
#include <jsi/jsi.h>

#include <ReactCommon/CallInvokerHolder.h>
#include <worklets/Compat/StableApi.h>

#include "OneNativeSyncHost.h"
#include "OneNativeSyncBridge.h"

using namespace facebook;

namespace {

// cached registry refs, bound at install on the calling (JS queue) thread.
JavaVM *g_vm = nullptr;
jclass g_registryClass = nullptr;
jmethodID g_create = nullptr;
jmethodID g_destroy = nullptr;
jmethodID g_get = nullptr;
jmethodID g_set = nullptr;
jclass g_stringClass = nullptr;
jclass g_booleanClass = nullptr;
jmethodID g_booleanValue = nullptr;
jclass g_numberClass = nullptr;
jmethodID g_doubleValue = nullptr;

jclass globalClassRef(JNIEnv *env, const char *name) {
  jclass local = env->FindClass(name);
  jclass global = static_cast<jclass>(env->NewGlobalRef(local));
  env->DeleteLocalRef(local);
  return global;
}

struct JniEnv {
  JNIEnv *env = nullptr;
  bool attached = false;

  JniEnv() {
    jint status =
        g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
    if (status == JNI_EDETACHED) {
      g_vm->AttachCurrentThread(&env, nullptr);
      attached = true;
    }
  }

  ~JniEnv() {
    if (attached) {
      g_vm->DetachCurrentThread();
    }
  }
};

jobject toJava(JNIEnv *env, jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isString()) {
    std::string utf8 = value.asString(rt).utf8(rt);
    return env->NewStringUTF(utf8.c_str());
  }
  if (value.isBool()) {
    jmethodID valueOf = env->GetStaticMethodID(
        g_booleanClass, "valueOf", "(Z)Ljava/lang/Boolean;");
    return env->CallStaticObjectMethod(
        g_booleanClass, valueOf, (jboolean)value.getBool());
  }
  if (value.isNumber()) {
    jclass doubleClass = env->FindClass("java/lang/Double");
    jmethodID doubleCtor = env->GetMethodID(doubleClass, "<init>", "(D)V");
    jobject result = env->NewObject(doubleClass, doubleCtor, value.getNumber());
    env->DeleteLocalRef(doubleClass);
    return result;
  }
  throw jsi::JSError(
      rt, "OneNativeSyncState value must be a string, number, or boolean");
}

jsi::Value fromJava(JNIEnv *env, jsi::Runtime &rt, jobject value) {
  if (env->IsInstanceOf(value, g_stringClass)) {
    const char *utf8 =
        env->GetStringUTFChars(static_cast<jstring>(value), nullptr);
    jsi::Value result = jsi::Value(rt, jsi::String::createFromUtf8(rt, utf8));
    env->ReleaseStringUTFChars(static_cast<jstring>(value), utf8);
    return result;
  }
  if (env->IsInstanceOf(value, g_booleanClass)) {
    jboolean boolean = env->CallBooleanMethod(value, g_booleanValue);
    return jsi::Value((bool)boolean);
  }
  if (env->IsInstanceOf(value, g_numberClass)) {
    jdouble number = env->CallDoubleMethod(value, g_doubleValue);
    return jsi::Value((double)number);
  }
  throw jsi::JSError(rt, "OneNativeSyncState stored an unsupported value");
}

} // namespace

int32_t OneNativeSyncCreate(jsi::Runtime &runtime, const jsi::Value &initial) {
  JniEnv jni;
  jobject boxed = toJava(jni.env, runtime, initial);
  jint id = jni.env->CallStaticIntMethod(g_registryClass, g_create, boxed);
  jni.env->DeleteLocalRef(boxed);
  return (int32_t)id;
}

void OneNativeSyncRelease(int32_t stateId) {
  JniEnv jni;
  jni.env->CallStaticVoidMethod(g_registryClass, g_destroy, (jint)stateId);
}

jsi::Value OneNativeSyncGet(jsi::Runtime &runtime, int32_t stateId) {
  JniEnv jni;
  jobject boxed =
      jni.env->CallStaticObjectMethod(g_registryClass, g_get, (jint)stateId);
  if (boxed == nullptr) {
    throw jsi::JSError(runtime, "OneNativeSyncState was released");
  }
  jsi::Value result = fromJava(jni.env, runtime, boxed);
  jni.env->DeleteLocalRef(boxed);
  return result;
}

void OneNativeSyncSet(
    jsi::Runtime &runtime,
    int32_t stateId,
    const jsi::Value &value) {
  JniEnv jni;
  jobject boxed = toJava(jni.env, runtime, value);
  jni.env->CallStaticVoidMethod(g_registryClass, g_set, (jint)stateId, boxed);
  jni.env->DeleteLocalRef(boxed);
}

class OneNativeSyncJni : public jni::HybridClass<OneNativeSyncJni> {
 public:
  static auto constexpr kJavaDescriptor =
      "Ldev/onejs/onenative/OneNativeSyncJni;";

  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext,
      jni::alias_ref<react::CallInvokerHolder::javaobject> jsCallInvokerHolder);

  static void registerNatives();

 private:
  friend HybridBase;
  OneNativeSyncJni() = default;
};

jni::local_ref<OneNativeSyncJni::jhybriddata> OneNativeSyncJni::initHybrid(
    jni::alias_ref<OneNativeSyncJni::jhybridobject> jThis,
    jlong jsContext,
    jni::alias_ref<react::CallInvokerHolder::javaobject> jsCallInvokerHolder) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto &rnRuntime = *reinterpret_cast<jsi::Runtime *>(jsContext);
  // the installer stages the worklets UI holder global first (the reanimated
  // pattern); without it there is no UI runtime to install on.
  jsi::Value holder =
      rnRuntime.global().getProperty(rnRuntime, "__UI_WORKLET_RUNTIME_HOLDER");
  if (!holder.isObject()) {
    throw std::runtime_error(
        "OneNativeSyncState.install needs the worklets UI runtime (import react-native-worklets first)");
  }
  auto uiRuntime = worklets::getWorkletRuntimeFromHolder(
      rnRuntime, holder.asObject(rnRuntime));
  installOneNativeSyncState(rnRuntime, uiRuntime, jsCallInvoker);

  JNIEnv *env = jni::Environment::current();
  env->GetJavaVM(&g_vm);
  g_registryClass = globalClassRef(env, "dev/onejs/onenative/OneNativeSyncRegistry");
  g_create = env->GetStaticMethodID(g_registryClass, "create", "(Ljava/lang/Object;)I");
  g_destroy = env->GetStaticMethodID(g_registryClass, "destroy", "(I)V");
  g_get = env->GetStaticMethodID(g_registryClass, "get", "(I)Ljava/lang/Object;");
  g_set = env->GetStaticMethodID(g_registryClass, "set", "(ILjava/lang/Object;)V");
  g_stringClass = globalClassRef(env, "java/lang/String");
  g_booleanClass = globalClassRef(env, "java/lang/Boolean");
  g_booleanValue = env->GetMethodID(g_booleanClass, "booleanValue", "()Z");
  g_numberClass = globalClassRef(env, "java/lang/Number");
  g_doubleValue = env->GetMethodID(g_numberClass, "doubleValue", "()D");
  return makeCxxInstance();
}

void OneNativeSyncJni::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", OneNativeSyncJni::initHybrid),
  });
}

extern "C" JNIEXPORT void JNICALL
Java_dev_onejs_onenative_OneNativeSyncJni_nativeDidSetExternally(
    JNIEnv *,
    jclass,
    jint stateId) {
  OneNativeSyncDidSetExternally((int32_t)stateId);
}

jint JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(vm, [] {
    OneNativeSyncJni::registerNatives();
  });
}
