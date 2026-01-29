// Source Inspector - shows source location on hover when holding Option for 0.5s
// Uses shadow DOM for style isolation

;(function () {
  try {
    let active = false
    let host = null
    let shadow = null
    let overlay = null
    let tag = null
    let holdTimer = null
    const holdDelay = 500
    const mousePos = { x: 0, y: 0 }
    let removalObserver = null

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

    function showOverlay(el, source) {
      if (!host) createHost()
      const rect = el.getBoundingClientRect()
      overlay.style.display = 'block'
      overlay.style.top = rect.top + 'px'
      overlay.style.left = rect.left + 'px'
      overlay.style.width = rect.width + 'px'
      overlay.style.height = rect.height + 'px'
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
        const source = el.getAttribute('data-one-source')
        const lastColon = source.lastIndexOf(':')
        const filePath = source.slice(0, lastColon)
        const idx = source.slice(lastColon + 1)
        const info = window.__oneSourceInfo?.[filePath]
        const lineCol = info?.[idx]
        const displaySource = lineCol
          ? filePath + ':' + lineCol[0] + ':' + lineCol[1]
          : source
        showOverlay(el, displaySource)
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
      hideOverlay()
    }

    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Alt') {
        cancelHold()
        return
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        cancelHold()
        return
      }
      if (e.defaultPrevented) return
      if (holdTimer) return
      holdTimer = setTimeout(activate, holdDelay)
    })

    window.addEventListener('keyup', (e) => {
      if (e.defaultPrevented) return
      if (e.key === 'Alt') {
        deactivate()
      }
    })

    window.addEventListener('blur', deactivate)

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
          const lastColon = source.lastIndexOf(':')
          const filePath = source.slice(0, lastColon)
          const idx = source.slice(lastColon + 1)
          const info = window.__oneSourceInfo?.[filePath]
          const lineCol = info?.[idx]
          let url = '/__one/open-source?source=' + encodeURIComponent(source)
          if (lineCol) {
            url += '&line=' + lineCol[0] + '&column=' + lineCol[1]
          }
          fetch(url)
        }
      },
      true
    )
  } catch (e) {
    console.error('[Source Inspector] Failed to initialize:', e)
  }
})()
