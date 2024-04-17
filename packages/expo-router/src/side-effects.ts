// @ts-nocheck
let BLOB_URL_PREFIX = null

// WHY
// i cant get react-native-url-polyfill to work or the supposed built in one

globalThis['URL'] = class URL {
  _searchParamsInstance = null
  pathname = ''

  static createObjectURL(blob: Blob) {
    if (BLOB_URL_PREFIX === null) {
      throw new Error('Cannot create URL for blob!')
    }
    return `${BLOB_URL_PREFIX}${blob.data.blobId}?offset=${blob.data.offset}&size=${blob.size}`
  }

  static revokeObjectURL(url: string) {
    // Do nothing.
  }

  constructor(url: string, base: string) {
    let baseUrl = null
    if (!base || validateBaseUrl(url)) {
      this._url = url
      if (!this._url.endsWith('/')) {
        this._url += '/'
      }
    } else {
      if (typeof base === 'string') {
        baseUrl = base
        if (!validateBaseUrl(baseUrl)) {
          throw new TypeError(`Invalid base URL: ${baseUrl}`)
        }
      } else if (typeof base === 'object') {
        baseUrl = base.toString()
      }
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, baseUrl.length - 1)
      }
      if (!url.startsWith('/')) {
        url = `/${url}`
      }
      if (baseUrl.endsWith(url)) {
        url = ''
      }
      this.pathname = url
      this._url = `${baseUrl}${url}`
    }
  }

  get hash() {
    return ''
  }

  get host() {
    throw new Error('not implemented host')
  }

  get hostname() {
    throw new Error('not implemented hostname')
  }

  get href(): string {
    return this.toString()
  }

  get origin() {
    throw new Error('not implemented origin')
  }

  get password() {
    throw new Error('not implemented password')
  }

  get port() {
    throw new Error('not implemented port')
  }

  get protocol() {
    throw new Error('not implemented protocol')
  }

  get search() {
    return ''
  }

  get searchParams(): URLSearchParams {
    if (this._searchParamsInstance == null) {
      this._searchParamsInstance = new URLSearchParams()
    }
    return this._searchParamsInstance
  }

  toJSON(): string {
    return this.toString()
  }

  toString(): string {
    if (this._searchParamsInstance === null) {
      return this._url
    }
    const separator = this._url.indexOf('?') > -1 ? '&' : '?'
    return this._url + separator + this._searchParamsInstance.toString()
  }

  get username() {
    throw new Error('not implemented username')
  }
}

function validateBaseUrl(url: string) {
  // from this MIT-licensed gist: https://gist.github.com/dperini/729294
  return /^(?:(?:(?:https?|ftp):)?\/\/)(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
    url
  )
}
