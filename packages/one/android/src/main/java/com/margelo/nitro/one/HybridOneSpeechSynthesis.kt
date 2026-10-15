package com.margelo.nitro.one

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.Locale

// text-to-speech behind One.SpeechSynthesis, matching expo-speech: the
// platform TextToSpeech queues utterances, stop clears the queue, and each
// utterance carries its own event callback. the engine initializes
// asynchronously, so speaks before it is ready wait in line. pause and
// resume are ios only and resolve without doing anything. everything runs
// on the main thread, where the engine lives.
class HybridOneSpeechSynthesis : HybridOneSpeechSynthesisSpec() {
    private data class Utterance(
        val id: String,
        val config: SpeechSynthesisUtterance,
        val onEvent: (SpeechSynthesisEvent) -> Unit
    )

    private val main = Handler(Looper.getMainLooper())
    private var engine: TextToSpeech? = null
    private var starting = false
    private var engineReady = false
    private var nextId = 0
    private val waiting = ArrayDeque<Utterance>()
    private val live = mutableMapOf<String, Utterance>()

    override val maxInputLength: Double = MAX_INPUT_LENGTH.toDouble()

    private fun context() =
        NitroModules.applicationContext
            ?: throw IllegalStateException("SpeechSynthesis: the react context is not ready")

    private fun ensureEngine() {
        if (engine != null) return
        starting = true
        val tts = TextToSpeech(context(), { status ->
            main.post {
                starting = false
                engineReady = status == TextToSpeech.SUCCESS
                drain()
            }
        }, null)
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                event(utteranceId, SpeechSynthesisEventType.START, null, terminal = false)
            }

            override fun onDone(utteranceId: String?) {
                event(utteranceId, SpeechSynthesisEventType.DONE, null, terminal = true)
            }

            override fun onError(utteranceId: String?) {
                event(utteranceId, SpeechSynthesisEventType.ERROR, "synthesis failed", terminal = true)
            }

            override fun onError(utteranceId: String?, errorCode: Int) {
                event(
                    utteranceId,
                    SpeechSynthesisEventType.ERROR,
                    "synthesis failed with code $errorCode",
                    terminal = true
                )
            }

            override fun onStop(utteranceId: String?, interrupted: Boolean) {
                event(utteranceId, SpeechSynthesisEventType.STOPPED, null, terminal = true)
            }

            override fun onRangeStart(
                utteranceId: String?,
                start: Int,
                end: Int,
                frame: Int
            ) {
            }

            // an utterance stays live across start and settles once on its
            // terminal event. the platform guarantees done after start, so
            // removing on start would drop the done that resolves speak.
            private fun event(
                utteranceId: String?,
                type: SpeechSynthesisEventType,
                message: String?,
                terminal: Boolean
            ) {
                if (utteranceId == null) return
                main.post {
                    val utterance =
                        if (terminal) live.remove(utteranceId)
                        else live[utteranceId]
                    utterance?.onEvent?.invoke(SpeechSynthesisEvent(type, message))
                }
            }
        })
        engine = tts
    }

    override fun speak(
        utterance: SpeechSynthesisUtterance,
        onEvent: (SpeechSynthesisEvent) -> Unit
    ) {
        main.post {
            ensureEngine()
            val id = "one-${nextId++}"
            waiting += Utterance(id, utterance, onEvent)
            drain()
        }
    }

    private fun drain() {
        val tts = engine ?: return
        // the engine starts asynchronously; utterances spoken while it
        // starts wait for the init callback.
        if (starting) return
        if (!engineReady) {
            val failed = waiting.toList()
            waiting.clear()
            failed.forEach {
                it.onEvent(
                    SpeechSynthesisEvent(
                        SpeechSynthesisEventType.ERROR,
                        "the text-to-speech engine failed to start"
                    )
                )
            }
            return
        }
        while (waiting.isNotEmpty()) {
            val next = waiting.removeFirst()
            val config = configure(tts, next)
            if (config == null) {
                next.onEvent(
                    SpeechSynthesisEvent(
                        SpeechSynthesisEventType.ERROR,
                        "this voice or language is not supported"
                    )
                )
                continue
            }
            live[next.id] = next
            val result = tts.speak(next.config.text, TextToSpeech.QUEUE_ADD, config, next.id)
            if (result != TextToSpeech.SUCCESS) {
                live.remove(next.id)
                next.onEvent(
                    SpeechSynthesisEvent(
                        SpeechSynthesisEventType.ERROR,
                        "the text-to-speech engine rejected the utterance"
                    )
                )
            }
        }
    }

    // applies the utterance config to the shared engine. resolves the voice
    // by identifier first, then the language, and reports null when neither
    // is available so the utterance fails with an error event.
    private fun configure(tts: TextToSpeech, next: Utterance): Bundle? {
        val config = next.config
        val voiceName = config.voice
        if (voiceName != null) {
            val voice = tts.voices.orEmpty().firstOrNull { it.name == voiceName }
                ?: return null
            tts.voice = voice
        } else if (config.language != null) {
            val locale = Locale.forLanguageTag(config.language)
            val availability = tts.isLanguageAvailable(locale)
            if (
                availability != TextToSpeech.LANG_AVAILABLE &&
                availability != TextToSpeech.LANG_COUNTRY_AVAILABLE &&
                availability != TextToSpeech.LANG_COUNTRY_VAR_AVAILABLE
            ) {
                return null
            }
            tts.language = locale
        }
        config.pitch?.let { tts.setPitch(it.toFloat()) }
        config.rate?.let { tts.setSpeechRate(it.toFloat()) }
        return Bundle().apply {
            config.volume?.let { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, it.toFloat()) }
        }
    }

    override fun stop(): Promise<Unit> {
        val promise = Promise<Unit>()
        main.post {
            // every utterance settles here, so isSpeaking is false once stop
            // resolves; the engine's later onStop finds nothing live.
            val dropped = live.values.toList() + waiting
            waiting.clear()
            live.clear()
            engine?.stop()
            dropped.forEach {
                it.onEvent(SpeechSynthesisEvent(SpeechSynthesisEventType.STOPPED, null))
            }
            promise.resolve(Unit)
        }
        return promise
    }

    // android has no speech pause or resume; both resolve quietly so shared
    // code needs no platform check.
    override fun pause(): Promise<Unit> = Promise.resolved(Unit)

    override fun resume(): Promise<Unit> = Promise.resolved(Unit)

    // speaking or queued on this synthesizer, as AVSpeechSynthesizer reports
    // on ios. the engine's own isSpeaking spans every app and stays true
    // until its playback thread finishes the item that already sent onDone.
    override fun isSpeaking(): Promise<Boolean> {
        val promise = Promise<Boolean>()
        main.post { promise.resolve(waiting.isNotEmpty() || live.isNotEmpty()) }
        return promise
    }

    override fun getAvailableVoices(): Promise<Array<SpeechSynthesisVoice>> {
        val promise = Promise<Array<SpeechSynthesisVoice>>()
        main.post { promise.resolve(engineVoices()) }
        return promise
    }

    private fun engineVoices(): Array<SpeechSynthesisVoice> {
        ensureEngine()
        val tts = engine ?: return emptyArray()
        return try {
            tts.voices.orEmpty().map { voice ->
                SpeechSynthesisVoice(
                    voice.name,
                    languageOf(voice),
                    voice.name,
                    if (voice.quality >= 400) SpeechSynthesisVoiceQuality.ENHANCED
                    else SpeechSynthesisVoiceQuality.DEFAULT
                )
            }.sortedBy { it.name }.toTypedArray()
        } catch (_: Exception) {
            emptyArray()
        }
    }

    private fun languageOf(voice: Voice): String {
        val locale = voice.locale ?: return ""
        return locale.toLanguageTag()
    }

    override fun dispose() {
        main.post {
            engine?.setOnUtteranceProgressListener(null)
            engine?.shutdown()
            engine = null
            starting = false
            engineReady = false
            waiting.clear()
            live.clear()
        }
        super.dispose()
    }

    companion object {
        private const val MAX_INPUT_LENGTH = 4000
    }
}
