// Source Inspector - shows source location on hover when holding Option for 0.5s
// Also supports live highlighting from VSCode cursor position
// Uses shadow DOM for style isolation
// Note: createHotContext is already imported in dev.mjs which concatenates this file

;(function () {
  try {
    let active = false
    let cursorHighlightActive = false // separate state for vscode cursor highlighting
    let host = null
    let shadow = null
    let overlay = null
    let tag = null
    let pickerDialog = null
    let holdTimer = null
    const holdDelay = 800
    let otherKeyPressed = false
    const mousePos = { x: 0, y: 0 }
    let removalObserver = null
    let currentElementChain = []
    let recording = false
    let recordEvents = []
    let recordStartTime = 0
    let recordFrameCount = 0
    const recordThrottle = 3

    // set up HMR listener for cursor position from vscode
    const cursorHot = createHotContext('/__one_cursor_hmr')
    cursorHot.on('one:cursor-highlight', (data) => {
      if (data.clear) {
        cursorHighlightActive = false
        if (!active) hideOverlay()
        return
      }

      cursorHighlightActive = true
      highlightBySource(data.file, data.line, data.column)
    })

    function createHost() {
      if (host) return
      host = document.createElement('div')
      host.id = 'one-source-inspector'
      shadow = host.attachShadow({ mode: 'open' })
      shadow.innerHTML = `
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .overlay {
            position: fixed;
            pointer-events: none;
            z-index: 100000;
            background: rgba(100,100,100,0.2);
            border: 2px solid rgba(100,100,100,0.6);
            border-radius: 2px;
            transition: all 0.05s;
            display: none;
          }
          .tag {
            position: fixed;
            pointer-events: none;
            z-index: 100001;
            background: rgba(60,60,60,0.95);
            color: white;
            padding: 4px 8px;
            font-size: 12px;
            font-family: system-ui, -apple-system, sans-serif;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: none;
          }
          dialog { border: none; padding: 0; background: transparent; max-width: none; max-height: none; overflow: visible; }
          dialog::backdrop { background: rgba(0,0,0,0.01); }
          .picker-dialog { position: fixed; margin: 0; z-index: 2147483647; }
          .picker { width: 320px; max-width: calc(100vw - 20px); background: #161616; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); display: flex; flex-direction: column; overflow: hidden; font: 12px system-ui, sans-serif; color: #ccc; }
          .picker-header { display: flex; align-items: center; justify-content: flex-end; padding: 6px 10px; background: #1a1a1a; gap: 8px; border-bottom: 1px solid #252525; }
          .picker-close { background: none; border: none; color: #666; cursor: pointer; padding: 2px 4px; font-size: 14px; line-height: 1; }
          .picker-close:hover { color: #fff; }
          .picker-shortcut { font-size: 11px; color: #888; padding: 4px 8px; cursor: pointer; border-radius: 4px; margin-left: auto; }
          .picker-shortcut:hover { color: #fff; background: #252525; }
          .picker-actions { display: flex; background: #1a1a1a; border-top: 1px solid #252525; border-bottom: 1px solid #252525; }
          .picker-btn { flex: 1; background: none; border: none; border-right: 1px solid #252525; color: #888; padding: 8px; font: 12px system-ui, sans-serif; cursor: pointer; transition: color 0.1s; }
          .picker-btn:last-child { border-right: none; }
          .picker-btn:hover { color: #fff; }
          .picker-btn.copied { color: #4ade80; }
          .picker-btn .rec-dot { display: inline-block; width: 8px; height: 8px; background: #f55; border-radius: 50%; }
          .toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(20,20,20,0.95); border-radius: 12px; padding: 24px 32px; text-align: center; z-index: 2147483647; box-shadow: 0 8px 32px rgba(0,0,0,0.5); pointer-events: none; font-family: system-ui, sans-serif; }
          .toast-big { font-size: 48px; font-weight: 600; color: #f55; }
          .toast-big.success { color: #4ade80; }
          .toast-hint { font-size: 12px; color: #888; margin-top: 12px; }
          .picker-list { max-height: 240px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #333 transparent; }
          .picker-list::-webkit-scrollbar { width: 4px; }
          .picker-list::-webkit-scrollbar-track { background: transparent; }
          .picker-list::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
          .picker-item { display: flex; align-items: center; padding: 8px 10px; color: #999; cursor: pointer; transition: background 0.08s; border-bottom: 1px solid #1e1e1e; gap: 8px; }
          .picker-item:last-child { border-bottom: none; }
          .picker-item:hover { background: #252525; color: #fff; }
          .picker-item-name { font-weight: 500; color: #ddd; min-width: 60px; }
          .picker-item-file { flex: 1; font-size: 10px; color: #555; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; direction: rtl; text-align: left; }
        </style>
        <div class="overlay"></div>
        <div class="tag"></div>
        <dialog class="picker-dialog" id="picker-dialog">
          <div class="picker" id="picker">
            <div class="picker-header">
              <span class="picker-shortcut">\u2325space</span>
              <button class="picker-close" id="picker-close">\u00d7</button>
            </div>
            <div class="picker-actions" id="picker-actions">
              <button class="picker-btn" data-action="open">Open</button>
              <button class="picker-btn" data-action="path">Path</button>
              <button class="picker-btn" data-action="selector">Selector</button>
              <button class="picker-btn" data-action="record" id="record-btn"><span class="rec-dot"></span></button>
            </div>
            <div class="picker-list" id="picker-list"></div>
          </div>
        </dialog>
      `
      document.body.appendChild(host)
      overlay = shadow.querySelector('.overlay')
      tag = shadow.querySelector('.tag')
      pickerDialog = shadow.getElementById('picker-dialog')
      setupPicker()
      setupRemovalObserver()
    }

    function setupPicker() {
      const closeBtn = shadow.getElementById('picker-close')
      const shortcut = shadow.querySelector('.picker-shortcut')
      const actions = shadow.getElementById('picker-actions')
      const list = shadow.getElementById('picker-list')

      closeBtn.addEventListener('click', () => {
        pickerDialog.close()
      })

      // click shortcut to open devtools menu
      shortcut.addEventListener('click', () => {
        pickerDialog.close()
        window.dispatchEvent(new CustomEvent('one-open-devtools'))
      })

      // click backdrop to close
      pickerDialog.addEventListener('click', (e) => {
        if (e.target === pickerDialog) pickerDialog.close()
      })

      actions.addEventListener('click', (e) => {
        const btn = e.target.closest('.picker-btn')
        if (!btn || !currentElementChain.length) return
        const action = btn.dataset.action
        const topEl = currentElementChain[0]

        if (action === 'open') {
          fetch('/__one/open-source?source=' + encodeURIComponent(topEl.source))
          pickerDialog.close()
        } else if (action === 'path') {
          const paths = currentElementChain.map((el) => el.source).join('\n')
          navigator.clipboard.writeText(paths)
          flashCopied(btn)
        } else if (action === 'selector') {
          const selector = generateSelector(topEl.element)
          navigator.clipboard.writeText(selector)
          flashCopied(btn)
        } else if (action === 'record') {
          if (recording) {
            stopRecording()
          } else {
            startRecording()
          }
        }
      })

      list.addEventListener('click', (e) => {
        const item = e.target.closest('.picker-item')
        if (!item) return
        const source = item.dataset.source
        if (source) {
          fetch('/__one/open-source?source=' + encodeURIComponent(source))
          pickerDialog.close()
        }
      })
    }

    function flashCopied(btn) {
      btn.classList.add('copied')
      const orig = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => {
        btn.classList.remove('copied')
        btn.textContent = orig
      }, 1000)
    }

    function generateSelector(el) {
      const parts = []
      let current = el
      while (current && current !== document.body) {
        if (current.id) {
          parts.unshift('#' + current.id)
          break
        }
        let selector = current.tagName.toLowerCase()
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).slice(0, 2)
          if (classes.length && classes[0]) {
            selector += '.' + classes.join('.')
          }
        }
        // add nth-child if needed for specificity
        const parent = current.parentElement
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c) => c.tagName === current.tagName
          )
          if (siblings.length > 1) {
            const idx = siblings.indexOf(current) + 1
            selector += ':nth-child(' + idx + ')'
          }
        }
        parts.unshift(selector)
        current = current.parentElement
      }
      return parts.join(' > ')
    }

    // recording functionality
    let recordHandlers = {}

    function getRecordSelector(el) {
      if (!el || el === document.body || el === document.documentElement) return null
      let current = el
      let path = []
      let anchor = null

      while (current && current !== document.body) {
        const id = current.id
        const testId = current.getAttribute('data-testid')
        const oneSource = current.getAttribute('data-one-source')

        if (id || testId || oneSource) {
          anchor = { id, testId, oneSource }
          break
        }

        let seg = current.tagName.toLowerCase()
        if (current.className && typeof current.className === 'string') {
          const cls = current.className
            .split(/\s+/)
            .filter((c) => c && !c.startsWith('_'))[0]
          if (cls) seg += '.' + cls
        }
        path.unshift(seg)
        current = current.parentElement
      }

      const pathStr = path.slice(-3).join(' > ')

      if (anchor) {
        const ref = anchor.id
          ? `#${anchor.id}`
          : anchor.testId
            ? `[data-testid="${anchor.testId}"]`
            : `[data-one-source="${anchor.oneSource}"]`
        return pathStr ? `${ref} > ${pathStr}` : ref
      }

      return pathStr || el.tagName.toLowerCase()
    }

    function getRecordElementInfo(el) {
      if (!el) return null
      const oneSource = el.getAttribute?.('data-one-source')
      return {
        selector: getRecordSelector(el),
        tag: el.tagName?.toLowerCase(),
        id: el.id || undefined,
        testId: el.getAttribute?.('data-testid') || undefined,
        source: oneSource || undefined,
        text: el.textContent?.slice(0, 50).trim() || undefined,
      }
    }

    function recordTs() {
      return Date.now() - recordStartTime
    }

    function getMods(e) {
      const m = []
      if (e.ctrlKey) m.push('ctrl')
      if (e.altKey) m.push('alt')
      if (e.shiftKey) m.push('shift')
      if (e.metaKey) m.push('cmd')
      return m.length ? m : undefined
    }

    function showToast(big, hint, duration, isSuccess) {
      if (!host) createHost()
      const toast = document.createElement('div')
      toast.className = 'toast'
      toast.innerHTML =
        '<div class="toast-big' +
        (isSuccess ? ' success' : '') +
        '">' +
        big +
        '</div>' +
        (hint ? '<div class="toast-hint">' + hint + '</div>' : '')
      shadow.appendChild(toast)
      if (duration) setTimeout(() => toast.remove(), duration)
      return toast
    }

    function showCountdownToast(onComplete) {
      if (!host) createHost()
      const toast = document.createElement('div')
      toast.className = 'toast'
      toast.innerHTML =
        '<div class="toast-big">2</div><div class="toast-hint">Tap Option to stop and copy</div>'
      shadow.appendChild(toast)
      const countEl = toast.querySelector('.toast-big')

      let count = 2
      const tick = () => {
        count--
        if (count > 0) {
          countEl.textContent = count
          setTimeout(tick, 1000)
        } else {
          toast.remove()
          onComplete()
        }
      }
      setTimeout(tick, 1000)
    }

    function startRecording() {
      // exit inspection mode and close dialog
      deactivate()
      pickerDialog?.close()

      showCountdownToast(() => {
        recording = true
        recordEvents = []
        recordFrameCount = 0
        recordStartTime = Date.now()

        recordEvents.push({
          t: 0,
          type: 'start',
          window: {
            w: window.innerWidth,
            h: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
          url: location.href,
          title: document.title,
        })

        recordHandlers = {
          mousemove: (e) => {
            recordFrameCount++
            if (recordFrameCount % recordThrottle !== 0) return
            recordEvents.push({ t: recordTs(), type: 'move', x: e.clientX, y: e.clientY })
          },
          click: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'click',
              x: e.clientX,
              y: e.clientY,
              btn: e.button,
              el: getRecordElementInfo(e.target),
            })
          },
          dblclick: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'dblclick',
              x: e.clientX,
              y: e.clientY,
              el: getRecordElementInfo(e.target),
            })
          },
          contextmenu: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'contextmenu',
              x: e.clientX,
              y: e.clientY,
              el: getRecordElementInfo(e.target),
            })
          },
          mousedown: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'mousedown',
              x: e.clientX,
              y: e.clientY,
              btn: e.button,
              el: getRecordElementInfo(e.target),
            })
          },
          mouseup: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'mouseup',
              x: e.clientX,
              y: e.clientY,
              btn: e.button,
            })
          },
          keydown: (e) => {
            if (e.key === 'Alt' || e.key === 'Meta') return
            recordEvents.push({
              t: recordTs(),
              type: 'keydown',
              key: e.key,
              code: e.code,
              mods: getMods(e),
              el: getRecordElementInfo(document.activeElement),
            })
          },
          keyup: (e) => {
            if (e.key === 'Alt' || e.key === 'Meta') return
            recordEvents.push({ t: recordTs(), type: 'keyup', key: e.key, code: e.code })
          },
          input: (e) => {
            const val = e.target.value
            recordEvents.push({
              t: recordTs(),
              type: 'input',
              val: val?.slice?.(-20),
              el: getRecordElementInfo(e.target),
            })
          },
          change: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'change',
              el: getRecordElementInfo(e.target),
            })
          },
          focus: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'focus',
              el: getRecordElementInfo(e.target),
            })
          },
          blur: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'blur',
              el: getRecordElementInfo(e.target),
            })
          },
          scroll: () => {
            recordEvents.push({
              t: recordTs(),
              type: 'scroll',
              scrollX: window.scrollX,
              scrollY: window.scrollY,
            })
          },
          wheel: (e) => {
            recordEvents.push({
              t: recordTs(),
              type: 'wheel',
              x: e.clientX,
              y: e.clientY,
              dx: Math.round(e.deltaX),
              dy: Math.round(e.deltaY),
            })
          },
          resize: () => {
            recordEvents.push({
              t: recordTs(),
              type: 'resize',
              w: window.innerWidth,
              h: window.innerHeight,
            })
          },
        }

        Object.entries(recordHandlers).forEach(([evt, fn]) => {
          window.addEventListener(evt, fn, { capture: true, passive: true })
        })
      })
    }

    function getRecordingHeader() {
      // build header from current element chain
      const names = currentElementChain
        .slice(0, 4)
        .map((el) => el.name)
        .join(' < ')
      const selector = currentElementChain.length
        ? getRecordSelector(currentElementChain[0].element)
        : ''
      return { components: names, selector }
    }

    function stopRecording() {
      if (!recording) return
      recording = false

      Object.entries(recordHandlers).forEach(([evt, fn]) => {
        window.removeEventListener(evt, fn, { capture: true })
      })
      recordHandlers = {}

      // capture final state
      const finalEl = document.elementFromPoint(mousePos.x, mousePos.y)
      const finalInfo = getRecordElementInfo(finalEl)

      const header = getRecordingHeader()
      const duration = recordTs()

      // build compact line-based format
      const lines = []
      lines.push('# Recording ' + new Date().toISOString())
      lines.push('# ' + location.href)
      if (header.components) lines.push('# components: ' + header.components)
      if (header.selector) lines.push('# selector: ' + header.selector)
      lines.push(
        '# window: ' +
          window.innerWidth +
          'x' +
          window.innerHeight +
          ' scroll:' +
          window.scrollX +
          ',' +
          window.scrollY
      )
      lines.push('# duration: ' + duration + 'ms events: ' + recordEvents.length)
      lines.push('')

      for (const e of recordEvents) {
        if (e.type === 'start') continue
        let line = e.t + ' ' + e.type
        if (e.x !== undefined) line += ' ' + e.x + ',' + e.y
        if (e.btn !== undefined) line += ' btn:' + e.btn
        if (e.dx !== undefined) line += ' d:' + e.dx + ',' + e.dy
        if (e.w !== undefined) line += ' ' + e.w + 'x' + e.h
        if (e.key) line += ' ' + e.key + (e.code !== e.key ? '(' + e.code + ')' : '')
        if (e.mods) line += ' +' + e.mods.join('+')
        if (e.val !== undefined) line += ' val:"' + e.val + '"'
        if (e.scrollX !== undefined) line += ' ' + e.scrollX + ',' + e.scrollY
        if (e.el) {
          if (e.el.selector) line += ' [' + e.el.selector + ']'
          if (e.el.source) line += ' @' + e.el.source.split('/').pop()
          if (e.el.text && e.type !== 'input') line += ' "' + e.el.text.slice(0, 30) + '"'
        }
        lines.push(line)
      }

      if (finalInfo) {
        lines.push('')
        lines.push('# final hover: ' + (finalInfo.selector || 'none'))
        if (finalInfo.source) lines.push('# final source: ' + finalInfo.source)
      }

      const output = lines.join('\n')
      navigator.clipboard
        .writeText(output)
        .then(() => {
          showToast('✓', 'Copied to clipboard', 1200, true)
        })
        .catch(() => {
          console.log('[Source Inspector] Recording:\n' + output)
        })

      recordEvents = []
    }

    function getElementChain(x, y) {
      const allElements = document.elementsFromPoint(x, y)
      const chain = []
      for (const element of allElements) {
        if (element.hasAttribute('data-one-source')) {
          chain.push({
            element,
            source: element.getAttribute('data-one-source'),
            name: getComponentName(element.getAttribute('data-one-source')),
          })
        }
      }
      return chain
    }

    function getComponentName(source) {
      const parts = source.split(':')
      const filePath = parts.slice(0, -2).join(':')
      const fileName = filePath.split('/').pop()
      // extract component name from file name
      return fileName.replace(/\.(tsx?|jsx?)$/, '')
    }

    function showPicker(x, y, chain) {
      if (!host) createHost()
      currentElementChain = chain

      // build list items
      const listEl = shadow.getElementById('picker-list')
      listEl.innerHTML = chain
        .map((el) => {
          const parts = el.source.split(':')
          const filePath = parts.slice(0, -2).join(':')
          const line = parts[parts.length - 2]
          // show just filename:line
          const shortFile = filePath.split('/').pop() + ':' + line
          return (
            '<div class="picker-item" data-source="' +
            escapeHtml(el.source) +
            '">' +
            '<span class="picker-item-name">' +
            escapeHtml(el.name) +
            '</span>' +
            '<span class="picker-item-file">' +
            escapeHtml(shortFile) +
            '</span>' +
            '</div>'
          )
        })
        .join('')

      // position picker near click, smart about viewport edges
      const pickerWidth = 320
      const pickerHeight = Math.min(300, 80 + chain.length * 36)
      const pad = 10

      let left = x + 10
      let top = y + 10
      let flippedUp = false

      // flip to left if too close to right edge
      if (left + pickerWidth > window.innerWidth - pad) {
        left = x - pickerWidth - 10
      }
      // flip up if too close to bottom
      if (top + pickerHeight > window.innerHeight - pad) {
        top = y - pickerHeight - 10
        flippedUp = true
      }
      // clamp to viewport
      left = Math.max(pad, Math.min(left, window.innerWidth - pickerWidth - pad))
      top = Math.max(pad, Math.min(top, window.innerHeight - pickerHeight - pad))

      // reorder elements so actions row is closest to mouse
      const picker = shadow.getElementById('picker')
      const header = picker.querySelector('.picker-header')
      const actions = picker.querySelector('.picker-actions')
      const list = picker.querySelector('.picker-list')

      if (flippedUp) {
        // picker is above click, put actions at bottom (closest to mouse)
        picker.style.flexDirection = 'column'
        header.style.order = '0'
        list.style.order = '1'
        actions.style.order = '2'
      } else {
        // picker is below click, put actions at top (closest to mouse)
        picker.style.flexDirection = 'column'
        header.style.order = '1'
        list.style.order = '2'
        actions.style.order = '0'
      }

      pickerDialog.style.left = left + 'px'
      pickerDialog.style.top = top + 'px'
      pickerDialog.showModal()
    }

    function escapeHtml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function setupRemovalObserver() {
      if (removalObserver) return
      removalObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.removedNodes) {
              if (node === host) {
                host = null
                shadow = null
                overlay = null
                tag = null
                pickerDialog = null
                return
              }
            }
          }
        }
      })
      removalObserver.observe(document.body, { childList: true })
    }

    function hideOverlay() {
      if (overlay) overlay.style.display = 'none'
      if (tag) tag.style.display = 'none'
    }

    function showOverlay(el, source, fromVscode = false) {
      if (!host) createHost()
      const rect = el.getBoundingClientRect()
      overlay.style.display = 'block'
      overlay.style.top = rect.top + 'px'
      overlay.style.left = rect.left + 'px'
      overlay.style.width = rect.width + 'px'
      overlay.style.height = rect.height + 'px'
      // use different color for vscode cursor highlight
      if (fromVscode) {
        overlay.style.background = 'rgba(59, 130, 246, 0.2)'
        overlay.style.borderColor = 'rgba(59, 130, 246, 0.8)'
      } else {
        overlay.style.background = 'rgba(100, 100, 100, 0.2)'
        overlay.style.borderColor = 'rgba(100, 100, 100, 0.6)'
      }
      tag.style.display = 'block'
      tag.textContent = source
      let top = rect.top - 28
      if (top < 0) top = rect.bottom + 4
      tag.style.top = top + 'px'
      tag.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 200)) + 'px'
    }

    function cancelHold() {
      if (holdTimer) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
    }

    function parseSource(source) {
      const parts = source.split(':')
      const column = parseInt(parts.pop(), 10)
      const line = parseInt(parts.pop(), 10)
      const filePath = parts.join(':')
      return { filePath, line, column }
    }

    // find element by source file and line/column from vscode
    function highlightBySource(file, line, column) {
      // find all elements with data-one-source that match this file
      const elements = document.querySelectorAll(`[data-one-source^="${file}:"]`)

      let bestMatch = null
      let bestDistance = Infinity

      for (const el of elements) {
        const source = el.getAttribute('data-one-source')
        const parsed = parseSource(source)

        // find element whose line is <= cursor line (closest opening tag above/at cursor)
        if (parsed.line <= line) {
          const distance = line - parsed.line
          if (
            distance < bestDistance ||
            (distance === bestDistance && parsed.line === line)
          ) {
            bestDistance = distance
            bestMatch = { el, source }
          }
        }
      }

      if (bestMatch) {
        showOverlay(bestMatch.el, bestMatch.source, true)
      } else {
        hideOverlay()
      }
    }

    function updateOverlayAtPosition(x, y) {
      const allElements = document.elementsFromPoint(x, y)
      let el = null
      for (const element of allElements) {
        if (element.hasAttribute('data-one-source')) {
          el = element
          break
        }
      }
      if (el) {
        showOverlay(el, el.getAttribute('data-one-source'))
      } else {
        hideOverlay()
      }
    }

    function activate() {
      active = true
      updateOverlayAtPosition(mousePos.x, mousePos.y)
    }

    // expose for devtools menu
    window.__oneSourceInspector = {
      activate,
      deactivate,
      isActive: () => active,
      closePicker: () => pickerDialog?.close(),
      startRecording: () => {
        currentElementChain = [] // no element context
        startRecording()
      },
    }

    function deactivate() {
      cancelHold()
      active = false
      // only hide if vscode isn't actively highlighting
      if (!cursorHighlightActive) {
        hideOverlay()
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Alt') {
        // any other key pressed cancels and marks that we're in a combo
        cancelHold()
        otherKeyPressed = true
        return
      }
      // option key pressed
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        cancelHold()
        return
      }
      // if another key was held before option, don't start
      if (otherKeyPressed) return
      if (e.defaultPrevented) return
      if (holdTimer) return
      holdTimer = setTimeout(() => {
        // double check no other key was pressed during the delay
        if (!otherKeyPressed) {
          activate()
        }
      }, holdDelay)
    })

    window.addEventListener('keyup', (e) => {
      if (e.defaultPrevented) return
      if (e.key === 'Alt') {
        // if recording, stop on option release
        if (recording) {
          stopRecording()
          return
        }
        deactivate()
      } else {
        // reset when other keys are released (check if no modifiers held)
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
          otherKeyPressed = false
        }
      }
    })

    window.addEventListener('blur', () => {
      deactivate()
      otherKeyPressed = false
    })

    // deactivate when window is being resized (e.g. option+drag corner on macOS)
    window.addEventListener('resize', () => {
      deactivate()
    })

    document.addEventListener('mousemove', (e) => {
      mousePos.x = e.clientX
      mousePos.y = e.clientY
      if (!active) return
      updateOverlayAtPosition(e.clientX, e.clientY)
    })

    document.addEventListener(
      'click',
      (e) => {
        if (!active) return
        const chain = getElementChain(e.clientX, e.clientY)
        if (chain.length) {
          e.preventDefault()
          e.stopPropagation()
          deactivate()
          showPicker(e.clientX, e.clientY, chain)
        }
      },
      true
    )

    // close picker on escape, prevent bubbling
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape' && pickerDialog?.open) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          pickerDialog.close()
        }
      },
      true
    )
  } catch (e) {
    console.error('[Source Inspector] Failed to initialize:', e)
  }
})()
