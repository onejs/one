# Android native fixture failure diagnosis

The Metro Android proof in `test-native-android.yml` exposed two independent
failures. This records the investigation requested on 2026-10-19.

## Speech replacement

TESTED by inspection of run [39392854088](https://github.com/onejs/one/actions/runs/39392854088):
Google's service processes A's cancellation at 08:51:17.957, reports CANCELLED at
17.959, releases its audio focus at 17.980, and closes the audio stream at 17.987.
B's service `onStartListening` follows at 17.989 with a different audio client.
B opens its microphone at 18.074. At 19.103 its network recognizer reports S3 gRPC
error -83103, translated into Android ERROR_CLIENT (5). Its offline recognizer
also reports a missing language pack. The retained 84-speech-session-b-opens
capture already shows `A: start`, `B: start,error:unknown`, and the code-5 message.

The [Android SpeechRecognizer contract](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/speech/SpeechRecognizer.java)
requires waiting for results or error after `stopListening`. It specifies no
completion callback to await after `cancel`.
[RecognitionService](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/main/core/java/android/speech/RecognitionService.java)
serializes cancel and start through its handler. Cancel invokes the provider and
clears the old listener's session; start rejects an already-active listener or a
full service. One retires the cancelled recognizer and uses a new listener for B.

INFERRED: the observed failure is in the speech provider, with no demonstrated
violation of One's cancellation contract. B was accepted and opened before the
remote service failed. A framework rejection of B before opening, or evidence
that One reused A's listener, would contradict this conclusion. Google's private
S3 error does not establish its internal cause, and a provider race remains
possible. No native lifecycle change is justified by these captures.

Replacement, abort and stop checks now reject terminal errors immediately,
including when a log starts with `start`. Opening requires a live session;
stopping still requires `end`,
and A must stay silent after replacement or abort. Service errors remain failures
with the step, session log, and provider message attached.

## Back while the keyboard is open

TESTED by inspection of run [39382647762 attempt 1](https://github.com/onejs/one/actions/runs/39382647762/attempts/1):
at 07:15:32.754 Back is followed by IME hiding, with onHidden at 33.149. The final
capture still contains the inputs screen. The fixture now dismisses a shown IME,
awaits hidden state while requiring that the inputs screen remains, then presses
Back to navigate home. No retry or extended timeout is involved.

## Wait diagnostics

Timeouts name the failed diagnostic conjuncts, or the named step's predicate when
there are no conjunct labels. A mount-marker count is included only when the last
usable snapshot actually has zero or multiple matches. Missing snapshots are
reported separately. The existing snapshot harness exercises present and absent
markers against the same failing predicate.
