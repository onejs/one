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
    let holdTimer = null
    const holdDelay = 800
    let otherKeyPressed = false
    const mousePos = { x: 0, y: 0 }
    let removalObserver = null

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
        </style>
        <div class="overlay"></div>
        <div class="tag"></div>
      `
      document.body.appendChild(host)
      overlay = shadow.querySelector('.overlay')
      tag = shadow.querySelector('.tag')
      setupRemovalObserver()
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
          if (distance < bestDistance || (distance === bestDistance && parsed.line === line)) {
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
        const allElements = document.elementsFromPoint(e.clientX, e.clientY)
        let el = null
        for (const element of allElements) {
          if (element.hasAttribute('data-one-source')) {
            el = element
            break
          }
        }
        if (el) {
          e.preventDefault()
          e.stopPropagation()
          const source = el.getAttribute('data-one-source')
          fetch('/__one/open-source?source=' + encodeURIComponent(source))
        }
      },
      true
    )
  } catch (e) {
    console.error('[Source Inspector] Failed to initialize:', e)
  }
})()
