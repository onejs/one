package dev.onejs.protectedstoreprobe;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import android.util.Log;
import android.widget.TextView;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import javax.crypto.spec.SecretKeySpec;
import java.security.spec.MGF1ParameterSpec;

public final class ProbeActivity extends Activity {
  private static final String PREFIX = "one.probe.r59432.";
  private static final OAEPParameterSpec OAEP = new OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA1, PSource.PSpecified.DEFAULT);
  private CancellationSignal cancellation;
  private int generation;
  private TextView text;
  private KeyStore store;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    text = new TextView(this);
    text.setTextSize(18);
    setContentView(text);
    try { store = KeyStore.getInstance("AndroidKeyStore"); store.load(null); dispatch(getIntent()); }
    catch (Exception e) { emit("startup", "error", e.toString()); }
  }
  @Override public void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); dispatch(intent); }
  @Override public void onDestroy() { generation++; if (cancellation != null) cancellation.cancel(); super.onDestroy(); }
  private void emit(String action, String result, String detail) {
    try {
      JSONObject event = new JSONObject().put("action", action).put("result", result).put("detail", detail).put("epochMs", System.currentTimeMillis());
      Log.i("OnePSProbe", event.toString());
      text.setText(event.toString());
      try (FileOutputStream out = new FileOutputStream(new File(getNoBackupFilesDir(), "events.jsonl"), true)) {
        out.write((event.toString() + "\n").getBytes(StandardCharsets.UTF_8));
      }
    } catch (Exception e) { Log.e("OnePSProbe", "receipt failed", e); }
  }
  private File file(String key) { return new File(getNoBackupFilesDir(), key + ".json"); }
  private static String hash(byte[] bytes) throws Exception {
    return Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(bytes), Base64.NO_WRAP);
  }
  private String recordHash(String key) throws Exception { return file(key).exists() ? hash(readBytes(key)) : "missing"; }
  private byte[] readBytes(String key) throws Exception { return new AtomicFile(file(key)).readFully(); }
  private JSONObject read(String key) throws Exception { return new JSONObject(new String(readBytes(key), StandardCharsets.UTF_8)); }
  private static String b64(byte[] value) { return Base64.encodeToString(value, Base64.NO_WRAP); }
  private static byte[] bytes(JSONObject obj, String field) throws Exception { return Base64.decode(obj.getString(field), Base64.NO_WRAP); }
  private void write(String key, JSONObject obj) throws Exception {
    AtomicFile atomic = new AtomicFile(file(key));
    FileOutputStream out = atomic.startWrite();
    try { out.write(obj.toString().getBytes(StandardCharsets.UTF_8)); atomic.finishWrite(out); }
    catch (Exception e) { atomic.failWrite(out); throw e; }
  }
  private int authenticators(String policy) {
    return policy.equals("biometryCurrentSet") ? BiometricManager.Authenticators.BIOMETRIC_STRONG :
      BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
  }
  private void generate(String key, String policy) throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA", "AndroidKeyStore");
    generator.initialize(new KeyGenParameterSpec.Builder(PREFIX + key, KeyProperties.PURPOSE_DECRYPT)
      .setKeySize(2048).setDigests(KeyProperties.DIGEST_SHA256)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
      .setUserAuthenticationRequired(true)
      .setUserAuthenticationParameters(0, policy.equals("biometryCurrentSet") ? KeyProperties.AUTH_BIOMETRIC_STRONG :
        KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL)
      .setInvalidatedByBiometricEnrollment(policy.equals("biometryCurrentSet"))
      .setUnlockedDeviceRequired(true).build());
    generator.generateKeyPair();
  }
  private JSONObject encrypt(String key, String policy, String value) throws Exception {
    byte[] dek = new byte[32]; new SecureRandom().nextBytes(dek);
    try {
      Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
      aes.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(dek, "AES"));
      aes.updateAAD((key + ":" + policy).getBytes(StandardCharsets.UTF_8));
      byte[] encrypted = aes.doFinal(value.getBytes(StandardCharsets.UTF_8));
      PublicKey publicKey = store.getCertificate(PREFIX + key).getPublicKey();
      // public key material is unrestricted; choose the ordinary jca provider.
      publicKey = KeyFactory.getInstance("RSA").generatePublic(new java.security.spec.X509EncodedKeySpec(publicKey.getEncoded()));
      Cipher rsa = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
      rsa.init(Cipher.ENCRYPT_MODE, publicKey, OAEP);
      return new JSONObject().put("policy", policy).put("wrapped", b64(rsa.doFinal(dek)))
        .put("iv", b64(aes.getIV())).put("ciphertext", b64(encrypted));
    } finally { Arrays.fill(dek, (byte) 0); }
  }
  private Cipher privateOperation(String key) throws Exception {
    Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
    cipher.init(Cipher.DECRYPT_MODE, (PrivateKey) store.getKey(PREFIX + key, null), OAEP);
    return cipher;
  }
  private String decrypt(String key, JSONObject record, Cipher rsa) throws Exception {
    byte[] dek = rsa.doFinal(bytes(record, "wrapped"));
    try {
      Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
      aes.init(Cipher.DECRYPT_MODE, new SecretKeySpec(dek, "AES"), new GCMParameterSpec(128, bytes(record, "iv")));
      aes.updateAAD((key + ":" + record.getString("policy")).getBytes(StandardCharsets.UTF_8));
      return hash(aes.doFinal(bytes(record, "ciphertext")));
    } finally { Arrays.fill(dek, (byte) 0); }
  }
  private void state(String key) throws Exception {
    JSONObject obj = new JSONObject().put("recordHash", recordHash(key)).put("aliasPresent", store.containsAlias(PREFIX + key));
    if (store.containsAlias(PREFIX + key)) {
      PrivateKey privateKey = (PrivateKey) store.getKey(PREFIX + key, null);
      KeyInfo info = KeyFactory.getInstance("RSA", "AndroidKeyStore").getKeySpec(privateKey, KeyInfo.class);
      obj.put("authRequired", info.isUserAuthenticationRequired()).put("timeout", info.getUserAuthenticationValidityDurationSeconds())
        .put("authType", info.getUserAuthenticationType()).put("invalidatedByEnrollment", info.isInvalidatedByBiometricEnrollment())
        .put("unlockedRequired", info.isUnlockedDeviceRequired()).put("securityLevel", info.getSecurityLevel())
        .put("privateExportable", privateKey.getEncoded() != null).put("publicHash", hash(store.getCertificate(PREFIX + key).getPublicKey().getEncoded()));
    }
    emit("state:" + key, "observed", obj.toString());
  }
  private void dispatch(Intent intent) {
    generation++; if (cancellation != null) cancellation.cancel(); cancellation = null;
    String action = intent.getStringExtra("action"); if (action == null) action = "capabilities";
    String key = intent.getStringExtra("key"); if (key == null) key = "presence";
    String policy = intent.getStringExtra("policy"); if (policy == null) policy = "userPresence";
    String value = intent.getStringExtra("value"); if (value == null) value = "probe-value-r59432";
    long started = System.nanoTime();
    try {
      if (action.equals("capabilities")) {
        emit(action, "observed", new JSONObject().put("secure", getSystemService(KeyguardManager.class).isDeviceSecure())
          .put("strong", getSystemService(BiometricManager.class).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG))
          .put("presence", getSystemService(BiometricManager.class).canAuthenticate(authenticators("userPresence"))).toString());
      } else if (action.equals("create")) {
        if (file(key).exists() || store.containsAlias(PREFIX + key)) throw new IllegalStateException("exists; never replace alias");
        generate(key, policy); write(key, encrypt(key, policy, value));
        emit(action + ":" + key, "created-without-prompt", "hash=" + recordHash(key) + ";ns=" + (System.nanoTime() - started)); state(key);
      } else if (action.equals("state")) { state(key);
      } else if (action.equals("unauth")) {
        decrypt(key, read(key), privateOperation(key)); emit(action + ":" + key, "UNSAFE_DECRYPT_SUCCEEDED", "unauthenticated decrypt");
      } else if (action.equals("aes-negative")) {
        String alias = PREFIX + "aes-control";
        if (store.containsAlias(alias)) throw new IllegalStateException("control alias already exists");
        KeyGenerator generator = KeyGenerator.getInstance("AES", "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
          .setUserAuthenticationRequired(true).setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL).build());
        SecretKey secret = generator.generateKey();
        try { Cipher aes = Cipher.getInstance("AES/GCM/NoPadding"); aes.init(Cipher.ENCRYPT_MODE, secret); aes.doFinal(new byte[32]);
          emit(action, "UNSAFE_ENCRYPT_SUCCEEDED", "authenticated aes creation without auth"); }
        finally { store.deleteEntry(alias); }
      } else if (action.equals("cancel")) { emit(action, "cancel-requested", "generation advanced");
      } else if (action.equals("tamper")) {
        JSONObject record = read(key); byte[] data = bytes(record, "ciphertext"); data[0] ^= 1; record.put("ciphertext", b64(data)); write(key, record);
        emit(action, "tampered", recordHash(key));
      } else if (action.equals("get") || action.equals("update") || action.equals("delete")) {
        if (!file(key).exists()) { emit(action + ":" + key, action.equals("update") ? "not-found" : "missing", "no prompt"); return; }
        JSONObject record = read(key);
        if (!record.getString("policy").equals(policy)) throw new IllegalStateException("policy mismatch; no mutation");
        authenticate(action, key, policy, value, record);
      } else throw new IllegalArgumentException("unknown action");
    } catch (Exception e) { emit(action + ":" + key, "error", e.toString()); }
  }
  private void authenticate(String action, String key, String policy, String value, JSONObject record) throws Exception {
    final int requestGeneration = generation;
    final String priorHash = recordHash(key);
    final Cipher rsa = action.equals("delete") ? null : privateOperation(key);
    cancellation = new CancellationSignal();
    BiometricPrompt.Builder builder = new BiometricPrompt.Builder(this).setTitle("ProtectedStore " + action)
      .setDescription("Fresh SDK probe " + action + " for " + key).setAllowedAuthenticators(authenticators(policy));
    if (policy.equals("biometryCurrentSet")) builder.setNegativeButton("Cancel", getMainExecutor(), (dialog, which) -> {});
    BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
      @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
        try {
          if (requestGeneration != generation || isDestroyed() || cancellation.isCanceled()) throw new IllegalStateException("stale callback");
          if (!recordHash(key).equals(priorHash)) throw new IllegalStateException("record changed during authentication");
          String digest = "";
          if (rsa != null) {
            if (result.getCryptoObject() == null || result.getCryptoObject().getCipher() != rsa) throw new IllegalStateException("wrong operation");
            digest = decrypt(key, record, rsa);
          }
          if (action.equals("update")) write(key, encrypt(key, policy, value));
          if (action.equals("delete")) { new AtomicFile(file(key)).delete(); store.deleteEntry(PREFIX + key); }
          emit(action + ":" + key, "authenticated", "type=" + result.getAuthenticationType() + ";valueDigest=" + digest + ";recordHash=" + recordHash(key));
          if (rsa != null) {
            try { decrypt(key, record, rsa); emit("reuse-same-operation:" + key, "UNSAFE_DECRYPT_SUCCEEDED", "consumed cipher reused"); }
            catch (Exception e) { emit("reuse-same-operation:" + key, "blocked", e.toString()); }
            try { decrypt(key, record, privateOperation(key)); emit("reuse-new-operation:" + key, "UNSAFE_DECRYPT_SUCCEEDED", "prior authentication reused"); }
            catch (Exception e) { emit("reuse-new-operation:" + key, "blocked", e.toString()); }
          }
        } catch (Exception e) { emit(action + ":" + key, "post-auth-error", e.toString()); }
      }
      @Override public void onAuthenticationError(int code, CharSequence message) {
        try { emit(action + ":" + key, "auth-error", "code=" + code + ";" + message + ";unchanged=" + recordHash(key).equals(priorHash)); }
        catch (Exception e) { emit(action + ":" + key, "receipt-error", e.toString()); }
      }
      @Override public void onAuthenticationFailed() { emit(action + ":" + key, "auth-failed", "no mutation"); }
    };
    emit(action + ":" + key, "prompt-start", "generation=" + requestGeneration + ";recordHash=" + priorHash + ";crypto=" + (rsa != null));
    if (rsa == null) builder.build().authenticate(cancellation, getMainExecutor(), callback);
    else builder.build().authenticate(new BiometricPrompt.CryptoObject(rsa), cancellation, getMainExecutor(), callback);
  }
}
