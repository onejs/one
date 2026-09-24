package com.margelo.nitro.one

// nitro hands js the printed stack trace of a rejected throwable as the error
// message. this one prints as exactly "<code>: <message>", with no class name
// or frames, and the js entries split the stable code back out.
class OneNativeError(code: String, message: String) : Exception("$code: $message") {
    override fun fillInStackTrace(): Throwable = this

    override fun toString(): String = message ?: ""
}
