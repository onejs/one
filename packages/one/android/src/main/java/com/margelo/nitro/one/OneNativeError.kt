package com.margelo.nitro.one

// nitro hands js the printed stack trace of a rejected throwable as the error
// message. this one prints as exactly its message, with no class name or
// frames: "<code>: <message>" for a failure, whose stable code the js entries
// split back out, or the bare message for a call the platform cannot answer.
class OneNativeError(message: String) : Exception(message) {
    constructor(code: String, message: String) : this("$code: $message")

    override fun fillInStackTrace(): Throwable = this

    override fun toString(): String = message ?: ""
}
