// One DevTools - All panels in one draggable window
// Alt+Space opens searchable hot menu

;(function () {
  try {
    let host = null
    let shadow = null
    let spotlightDialog = null
    let panelDialog = null
    let panel = null
    let activeTab = 'seo'
    let isDragging = false
    const dragOffset = { x: 0, y: 0 }
    const panelPos = { x: 20, y: 20 }
    let snappedEdge = { h: null, v: null }
    let removalObserver = null
    let selectedIndex = 0
    let filteredItems = []
    let pluginPanelDispose = null
    // Identifies the current content render. Async plugin work from an older
    // render must dispose itself instead of touching the panel.
    let panelRenderId = 0

    // Plugins register after this script has evaluated, so the panel and
    // spotlight read from these live collections rather than a snapshot.
    const pluginPanels = new Map()
    const pluginItems = []

    const LOGO_SVG =
      '<svg width="24" height="24" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#FCD34D" stroke="#222" stroke-width="2"/><circle cx="50" cy="35" r="16" fill="white"/><text x="50" y="41" text-anchor="middle" font-family="system-ui" font-size="16" font-weight="bold" fill="#222">1</text></svg>'

    const allItems = [
      { id: 'seo', name: 'SEO Preview', type: 'panel', category: 'Panels' },
      { id: 'route', name: 'Route Info', type: 'panel', category: 'Panels' },
      { id: 'loader', name: 'Loader Timing', type: 'panel', category: 'Panels' },
      { id: 'errors', name: 'Errors', type: 'panel', category: 'Panels' },
      { id: 'inspect', name: 'Inspect Source', type: 'tool', category: 'Panels' },
      { id: 'record', name: 'Record Input', type: 'tool', category: 'Panels' },
      {
        id: 'clear-cookies',
        name: 'Clear Cookies',
        type: 'action',
        category: 'Clear Data',
      },
      {
        id: 'clear-localstorage',
        name: 'Clear localStorage',
        type: 'action',
        category: 'Clear Data',
      },
      {
        id: 'clear-sessionstorage',
        name: 'Clear sessionStorage',
        type: 'action',
        category: 'Clear Data',
      },
      {
        id: 'clear-indexeddb',
        name: 'Clear IndexedDB',
        type: 'action',
        category: 'Clear Data',
      },
      {
        id: 'clear-caches',
        name: 'Clear Cache Storage',
        type: 'action',
        category: 'Clear Data',
      },
      {
        id: 'clear-sw',
        name: 'Clear Service Workers',
        type: 'action',
        category: 'Clear Data',
      },
      { id: 'clear-all', name: 'Clear All', type: 'action', category: 'Clear Data' },
      { id: 'reload', name: 'Reload Page', type: 'action', category: 'Actions' },
      { id: 'hard-reload', name: 'Hard Reload', type: 'action', category: 'Actions' },
      { id: 'copy-url', name: 'Copy Current URL', type: 'action', category: 'Actions' },
      { id: 'copy-route', name: 'Copy Route Info', type: 'action', category: 'Actions' },
    ]

    const itemActions = {
      'clear-cookies': async () => {
        document.cookie.split(';').forEach((cookie) => {
          const name = (cookie.split('=')[0] || '').trim()
          if (!name) return
          const d = location.hostname
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
          document.cookie =
            name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + d
          document.cookie =
            name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + d
        })
      },
      'clear-localstorage': async () => {
        localStorage.clear()
      },
      'clear-sessionstorage': async () => {
        sessionStorage.clear()
      },
      'clear-indexeddb': async () => {
        if ('indexedDB' in window && typeof indexedDB.databases === 'function') {
          const dbs = await indexedDB.databases()
          await Promise.all(
            dbs.map((db) =>
              db.name
                ? new Promise((resolve) => {
                    const req = indexedDB.deleteDatabase(db.name)
                    req.onsuccess = resolve
                    req.onerror = resolve
                    req.onblocked = resolve
                  })
                : Promise.resolve()
            )
          )
        }
      },
      'clear-caches': async () => {
        if ('caches' in window) {
          const names = await caches.keys()
          await Promise.all(names.map((n) => caches.delete(n)))
        }
      },
      'clear-sw': async () => {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map((r) => r.unregister()))
        }
      },
      'clear-all': async () => {
        await itemActions['clear-cookies']()
        await itemActions['clear-localstorage']()
        await itemActions['clear-sessionstorage']()
        await itemActions['clear-indexeddb']()
        await itemActions['clear-caches']()
        await itemActions['clear-sw']()
      },
      reload: async () => {
        location.reload()
      },
      'hard-reload': async () => {
        if ('caches' in window) {
          const names = await caches.keys()
          await Promise.all(names.map((n) => caches.delete(n)))
        }
        location.reload()
      },
      'copy-url': async () => {
        await navigator.clipboard.writeText(location.href)
      },
      'copy-route': async () => {
        const dt = window.__oneDevtools || {}
        const info = {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          params: dt.routeInfo?.params || {},
        }
        await navigator.clipboard.writeText(JSON.stringify(info, null, 2))
      },
    }

    function escapeHtml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function createHost() {
      if (host) return
      host = document.createElement('div')
      host.id = 'one-devtools'
      shadow = host.attachShadow({ mode: 'open' })

      const css = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        dialog { border: none; padding: 0; background: transparent; max-width: none; max-height: none; overflow: visible; }
        dialog::backdrop { background: transparent; }
        #spotlight-dialog::backdrop { background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); }
        .spotlight { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; }
        .spotlight-box { background: #1a1a1a; border-radius: 12px; width: 340px; max-width: 90vw; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.5); display: flex; flex-direction: column; }
        .spotlight-header { display: flex; align-items: center; padding: 12px 14px; border-bottom: 1px solid #252525; gap: 10px; flex-shrink: 0; }
        .spotlight-header svg { width: 20px; height: 20px; flex-shrink: 0; }
        .spotlight-search { flex: 1; background: transparent; border: none; color: #eee; font: 14px system-ui, sans-serif; outline: none; min-width: 0; }
        .spotlight-search::placeholder { color: #555; }
        .spotlight-items { max-height: 354px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #333 transparent; }
        .spotlight-items::-webkit-scrollbar { width: 4px; }
        .spotlight-items::-webkit-scrollbar-track { background: transparent; }
        .spotlight-items::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .spotlight-category { font: 10px system-ui, sans-serif; color: #505050; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 16px 4px; user-select: none; }
        .spotlight-item { display: flex; align-items: center; padding: 10px 16px; color: #aaa; font: 13px system-ui, sans-serif; cursor: pointer; transition: background 0.08s; }
        .spotlight-item:hover, .spotlight-item.selected { background: #252525; color: #fff; }
        .spotlight-item .name { flex: 1; }
        .spotlight-item .status { font-size: 11px; color: #666; margin-left: 8px; }
        .spotlight-item .status.ok { color: #4ade80; }
        .spotlight-item .status.err { color: #f87171; }
        .spotlight-empty { text-align: center; color: #444; padding: 24px; font: 13px system-ui, sans-serif; }
        .panel-dialog { position: fixed; margin: 0; inset: unset; z-index: 2147483647; }
        .panel-dialog::backdrop { display: none; }
        .panel { width: 420px; max-width: calc(100vw - 40px); max-height: calc(100vh - 40px); background: #161616; border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.4); display: flex; flex-direction: column; overflow: hidden; font: 13px system-ui, sans-serif; color: #ccc; }
        .panel-header { display: flex; align-items: center; padding: 8px 12px; background: #1a1a1a; cursor: grab; user-select: none; gap: 8px; }
        .panel-header:active { cursor: grabbing; }
        .panel-header svg { width: 18px; height: 18px; }
        .panel-title { font-weight: 500; color: #999; font-size: 12px; flex: 1; }
        .panel-shortcut { font-size: 10px; color: #444; margin-right: 4px; }
        .panel-close { background: none; border: none; color: #666; cursor: pointer; padding: 4px; font-size: 16px; line-height: 1; }
        .panel-close:hover { color: #fff; }
        .tabs { display: flex; background: #1a1a1a; padding: 0 8px; gap: 2px; overflow-x: auto; }
        .tab { padding: 8px 12px; background: none; border: none; color: #666; font: 12px system-ui, sans-serif; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.1s; white-space: nowrap; }
        .tab:hover { color: #999; }
        .tab.active { color: #fff; border-bottom-color: #666; }
        .content { flex: 1; overflow-y: auto; padding: 12px; min-height: 200px; max-height: calc(100vh - 140px); }
        .section { margin-bottom: 12px; }
        .section-title { font-size: 11px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #222; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #666; font-size: 11px; width: 90px; flex-shrink: 0; padding-top: 1px; }
        .info-value { color: #ccc; font-family: monospace; font-size: 12px; word-break: break-word; line-height: 1.4; flex: 1; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; }
        .badge-error { background: #3a2020; color: #f87171; }
        .badge-warn { background: #3a3520; color: #fbbf24; }
        .badge-info { background: #202a3a; color: #60a5fa; }
        .badge-success { background: #1a3a20; color: #4ade80; }
        .empty { text-align: center; color: #555; padding: 24px; }
        .error-item { background: #1e1e1e; border-radius: 6px; padding: 10px; margin-bottom: 8px; border-left: 3px solid #666; }
        .error-item.error { border-left-color: #f87171; }
        .error-msg { color: #f87171; font-family: monospace; font-size: 12px; margin-top: 6px; }
        .timing-bar { height: 16px; background: #252525; border-radius: 4px; overflow: hidden; display: flex; margin: 4px 0; }
        .timing-segment { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #fff; }
        .timing-module { background: #555; }
        .timing-exec { background: #888; }
        .preview-card { background: #1e1e1e; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
        .preview-title { font-size: 11px; color: #666; margin-bottom: 6px; }
        .issue-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; }
        .issue-icon { font-size: 10px; }
        .plugin-frame { width: 100%; height: 65vh; min-height: 320px; border: 0; border-radius: 6px; background: #111; display: block; }
        .plugin-mount { min-height: 200px; }
      `

      shadow.innerHTML =
        '<style>' +
        css +
        '</style>' +
        '<dialog id="spotlight-dialog"><div class="spotlight"><div class="spotlight-box" id="spotlight-box">' +
        '<div class="spotlight-header">' +
        LOGO_SVG +
        '<input type="text" class="spotlight-search" id="spotlight-search" placeholder="Search actions..." autocomplete="off" spellcheck="false" />' +
        '</div>' +
        '<div class="spotlight-items" id="spotlight-items"></div>' +
        '</div></div></dialog>' +
        '<dialog class="panel-dialog" id="panel-dialog"><div class="panel" id="panel"></div></dialog>'
      document.body.appendChild(host)

      setupSpotlight()
      setupPanel()
      setupKeyboard()
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
                spotlightDialog = null
                panelDialog = null
                panel = null
                setTimeout(createHost, 0)
                return
              }
            }
          }
        }
      })
      removalObserver.observe(document.body, { childList: true })
    }

    function fuzzyScore(raw, query) {
      // light fuzzy: prefer matching at word starts
      const text = raw.toLowerCase().replace(/\s+/g, '')
      const words = raw.toLowerCase().split(/\s+/)
      const wordStarts = new Set()
      let pos = 0
      for (const w of words) {
        wordStarts.add(pos)
        pos += w.length
      }
      let ti = 0
      let score = 0
      for (let qi = 0; qi < query.length; qi++) {
        const ch = query[qi]
        // scan for first match, but prefer word-start match
        let first = -1
        for (let j = ti; j < text.length; j++) {
          if (text[j] === ch) {
            if (wordStarts.has(j)) {
              first = j
              break
            }
            if (first === -1) first = j
          }
        }
        if (first === -1) return -1
        score += wordStarts.has(first) ? 10 : 1
        ti = first + 1
      }
      return score
    }

    function renderSpotlightItems(query) {
      const q = (query || '').toLowerCase().replace(/\s+/g, '')
      const scored = []
      for (const item of [...allItems, ...pluginItems]) {
        if (!q) {
          scored.push({ item, score: 0 })
          continue
        }
        const ns = fuzzyScore(item.name, q)
        const cs = fuzzyScore(item.category, q)
        const best = Math.max(ns, cs)
        if (best >= 0) scored.push({ item, score: best })
      }
      scored.sort((a, b) => b.score - a.score)
      filteredItems = scored.map((s) => s.item)
      selectedIndex = filteredItems.length > 0 ? 0 : -1

      const container = shadow.getElementById('spotlight-items')
      if (!filteredItems.length) {
        container.innerHTML = '<div class="spotlight-empty">No matching actions</div>'
        return
      }

      let html = ''
      let lastCategory = ''
      filteredItems.forEach((item, index) => {
        if (item.category !== lastCategory) {
          lastCategory = item.category
          html +=
            '<div class="spotlight-category">' + escapeHtml(item.category) + '</div>'
        }
        html +=
          '<div class="spotlight-item' +
          (index === selectedIndex ? ' selected' : '') +
          '" data-id="' +
          escapeHtml(item.id) +
          '" data-index="' +
          index +
          '"><span class="name">' +
          escapeHtml(item.name) +
          '</span><span class="status"></span></div>'
      })

      container.innerHTML = html
    }

    function updateSelection() {
      if (!shadow) return
      shadow.querySelectorAll('.spotlight-item').forEach((el) => {
        const idx = parseInt(el.dataset.index)
        el.classList.toggle('selected', idx === selectedIndex)
      })
      const selected = shadow.querySelector('.spotlight-item.selected')
      if (selected) selected.scrollIntoView({ block: 'nearest' })
    }

    function findItem(itemId) {
      return (
        allItems.find((i) => i.id === itemId) || pluginItems.find((i) => i.id === itemId)
      )
    }

    function runWithStatus(item, fn) {
      const el = shadow
        ? Array.from(shadow.querySelectorAll('.spotlight-item')).find(
            (node) => node.dataset.id === item.id
          )
        : undefined
      const statusEl = el?.querySelector('.status')
      if (statusEl) statusEl.textContent = '...'

      return Promise.resolve()
        .then(fn)
        .then(() => {
          if (statusEl) {
            statusEl.textContent = '\u2713'
            statusEl.className = 'status ok'
          }
          setTimeout(hideSpotlight, 500)
        })
        .catch((err) => {
          if (statusEl) {
            statusEl.textContent = '\u2717'
            statusEl.className = 'status err'
          }
          console.error('[One DevTools]', err)
        })
    }

    function handleItemClick(itemId) {
      const item = findItem(itemId)
      if (!item) return

      if (item.type === 'panel') {
        hideSpotlight()
        activeTab = item.id
        showPanel()
        return
      }

      if (item.id === 'inspect') {
        hideSpotlight()
        window.__oneSourceInspector?.activate()
        return
      }

      if (item.id === 'record') {
        hideSpotlight()
        window.__oneSourceInspector?.startRecording()
        return
      }

      if (item.pluginAction) {
        runWithStatus(item, () => item.pluginAction.run(getPanelContext()))
        return
      }

      const actionFn = itemActions[item.id]
      if (!actionFn) return
      runWithStatus(item, actionFn)
    }

    function setupSpotlight() {
      spotlightDialog = shadow.getElementById('spotlight-dialog')
      const box = shadow.getElementById('spotlight-box')
      const searchInput = shadow.getElementById('spotlight-search')
      const itemsContainer = shadow.getElementById('spotlight-items')

      searchInput.addEventListener('input', () => {
        renderSpotlightItems(searchInput.value)
      })

      box.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (filteredItems.length) {
            selectedIndex = (selectedIndex + 1) % filteredItems.length
            updateSelection()
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (filteredItems.length) {
            selectedIndex =
              selectedIndex <= 0 ? filteredItems.length - 1 : selectedIndex - 1
            updateSelection()
          }
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
            handleItemClick(filteredItems[selectedIndex].id)
          }
        }
      })

      itemsContainer.addEventListener('mousemove', (e) => {
        const item = e.target.closest('.spotlight-item')
        if (item) {
          const idx = parseInt(item.dataset.index)
          if (!isNaN(idx) && idx !== selectedIndex) {
            selectedIndex = idx
            updateSelection()
          }
        }
      })

      itemsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.spotlight-item')
        if (item) handleItemClick(item.dataset.id)
      })

      spotlightDialog.addEventListener('click', (e) => {
        if (e.target === spotlightDialog) spotlightDialog.close()
      })
    }

    function setupPanel() {
      panelDialog = shadow.getElementById('panel-dialog')
      panel = shadow.getElementById('panel')
      panel.innerHTML =
        '<div class="panel-header" id="panel-header">' +
        LOGO_SVG +
        '<span class="panel-title">DevTools</span><span class="panel-shortcut">\u2325space</span><button class="panel-close" id="panel-close">\u00d7</button></div><div class="tabs" id="tabs"></div><div class="content" id="content"></div>'

      shadow.getElementById('panel-close').addEventListener('click', hidePanel)

      // Escape and other close paths go through the dialog, not hidePanel.
      panelDialog.addEventListener('close', () => {
        panelRenderId++
        disposePluginPanel()
        const content = shadow.getElementById('content')
        if (content) content.innerHTML = ''
      })

      const tabs = shadow.getElementById('tabs')
      tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab')
        if (tab && tab.dataset.tab !== activeTab) {
          activeTab = tab.dataset.tab
          updateTabs()
          updateContent()
        }
      })

      renderTabs()
      setupDrag()
    }

    function getTabItems() {
      const tabs = [
        { id: 'seo', name: 'SEO' },
        { id: 'route', name: 'Route' },
        { id: 'loader', name: 'Loader' },
        { id: 'errors', name: 'Errors' },
      ]
      for (const [id, entry] of pluginPanels) {
        tabs.push({ id, name: entry.plugin.title || entry.plugin.name })
      }
      return tabs
    }

    function renderTabs() {
      if (!shadow) return
      const tabs = shadow.getElementById('tabs')
      if (!tabs) return
      tabs.innerHTML = getTabItems()
        .map(
          (tab) =>
            '<button class="tab' +
            (tab.id === activeTab ? ' active' : '') +
            '" data-tab="' +
            escapeHtml(tab.id) +
            '">' +
            escapeHtml(tab.name) +
            '</button>'
        )
        .join('')
    }

    function setupDrag() {
      const header = shadow.getElementById('panel-header')

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.panel-close')) return
        isDragging = true
        const rect = panelDialog.getBoundingClientRect()
        dragOffset.x = e.clientX - rect.left
        dragOffset.y = e.clientY - rect.top
        panelPos.x = rect.left
        panelPos.y = rect.top
        snappedEdge = { h: null, v: null }
      })

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return
        const x = e.clientX - dragOffset.x
        const y = e.clientY - dragOffset.y
        const snapDist = 20
        const w = window.innerWidth
        const h = window.innerHeight
        const pw = panelDialog.offsetWidth
        const ph = panelDialog.offsetHeight
        const pad = 10

        let snapH = null
        let snapV = null

        if (x < snapDist) snapH = 'left'
        else if (x + pw > w - snapDist) snapH = 'right'
        if (y < snapDist) snapV = 'top'
        else if (y + ph > h - snapDist) snapV = 'bottom'

        snappedEdge = { h: snapH, v: snapV }

        if (snapH === 'left') {
          panelDialog.style.left = pad + 'px'
          panelDialog.style.right = 'auto'
        } else if (snapH === 'right') {
          panelDialog.style.left = 'auto'
          panelDialog.style.right = pad + 'px'
        } else {
          panelDialog.style.left = x + 'px'
          panelDialog.style.right = 'auto'
          panelPos.x = x
        }

        if (snapV === 'top') {
          panelDialog.style.top = pad + 'px'
          panelDialog.style.bottom = 'auto'
        } else if (snapV === 'bottom') {
          panelDialog.style.top = 'auto'
          panelDialog.style.bottom = pad + 'px'
        } else {
          panelDialog.style.top = y + 'px'
          panelDialog.style.bottom = 'auto'
          panelPos.y = y
        }
      })

      document.addEventListener('mouseup', () => {
        isDragging = false
      })
    }

    let keyboardSetup = false
    function setupKeyboard() {
      if (keyboardSetup) return
      keyboardSetup = true
      document.addEventListener(
        'keydown',
        (e) => {
          if (e.defaultPrevented || e.metaKey || e.ctrlKey) return

          if (e.altKey && e.code === 'Space') {
            e.preventDefault()
            toggleSpotlight()
          } else if (e.altKey && e.code === 'KeyI') {
            e.preventDefault()
            hideSpotlight()
            window.__oneSourceInspector?.activate()
          } else if (e.code === 'Escape') {
            if (spotlightDialog?.open) spotlightDialog.close()
            else if (panelDialog?.open) panelDialog.close()
          }
        },
        { capture: false }
      )
    }

    function toggleSpotlight() {
      if (spotlightDialog?.open) hideSpotlight()
      else showSpotlight()
    }

    function showSpotlight() {
      if (!host) createHost()
      // close source inspector picker if open
      window.__oneSourceInspector?.closePicker?.()
      const searchInput = shadow.getElementById('spotlight-search')
      searchInput.value = ''
      renderSpotlightItems('')
      spotlightDialog.showModal()
      requestAnimationFrame(() => searchInput.focus())
    }

    // listen for custom event from source inspector
    window.addEventListener('one-open-devtools', showSpotlight)

    function hideSpotlight() {
      if (spotlightDialog?.open) spotlightDialog.close()
    }

    function showPanel() {
      if (!host) createHost()
      const pad = 10
      if (snappedEdge.h === 'left') {
        panelDialog.style.left = pad + 'px'
        panelDialog.style.right = 'auto'
      } else if (snappedEdge.h === 'right') {
        panelDialog.style.left = 'auto'
        panelDialog.style.right = pad + 'px'
      } else {
        panelDialog.style.left = panelPos.x + 'px'
        panelDialog.style.right = 'auto'
      }
      if (snappedEdge.v === 'top') {
        panelDialog.style.top = pad + 'px'
        panelDialog.style.bottom = 'auto'
      } else if (snappedEdge.v === 'bottom') {
        panelDialog.style.top = 'auto'
        panelDialog.style.bottom = pad + 'px'
      } else {
        panelDialog.style.top = panelPos.y + 'px'
        panelDialog.style.bottom = 'auto'
      }
      panelDialog.show()
      updateTabs()
      updateContent()
    }

    function hidePanel() {
      panelRenderId++
      disposePluginPanel()
      if (panelDialog?.open) panelDialog.close()
      const content = shadow?.getElementById('content')
      if (content) content.innerHTML = ''
    }

    function updateTabs() {
      if (!shadow) return
      renderTabs()
    }

    function getPanelContext() {
      return {
        id: activeTab,
        project: window.__oneProjectRoot || '',
        url: location.href,
        openPanel(id) {
          activeTab = id
          showPanel()
        },
        closePanel: hidePanel,
      }
    }

    function disposePluginPanel() {
      if (typeof pluginPanelDispose === 'function') {
        try {
          pluginPanelDispose()
        } catch (error) {
          console.error('[One DevTools] Plugin panel cleanup failed:', error)
        }
      }
      pluginPanelDispose = null
    }

    function updateContent() {
      const renderId = ++panelRenderId
      const content = shadow.getElementById('content')
      const entry = pluginPanels.get(activeTab)

      disposePluginPanel()

      if (!entry) {
        if (activeTab === 'seo') content.innerHTML = getSeoContent()
        else if (activeTab === 'route') content.innerHTML = getRouteContent()
        else if (activeTab === 'loader') content.innerHTML = getLoaderContent()
        else if (activeTab === 'errors') content.innerHTML = getErrorsContent()
        return
      }

      renderPluginPanel(content, entry, activeTab, renderId)
    }

    async function renderPluginPanel(content, entry, panelId, renderId) {
      const { plugin, panel } = entry
      const context = getPanelContext()
      const isCurrent = () => renderId === panelRenderId && activeTab === panelId

      if ('url' in panel) {
        content.innerHTML = '<div class="empty">Loading ' + escapeHtml(plugin.title || plugin.name) + '...</div>'
        try {
          const url = typeof panel.url === 'function' ? await panel.url(context) : panel.url
          if (!isCurrent()) return
          content.innerHTML = ''
          const frame = document.createElement('iframe')
          frame.className = 'plugin-frame'
          frame.src = url
          frame.title = panel.title || plugin.title || plugin.name
          frame.setAttribute('allow', 'clipboard-read; clipboard-write')
          content.appendChild(frame)
        } catch (error) {
          if (!isCurrent()) return
          content.innerHTML =
            '<div class="empty">Could not load ' +
            escapeHtml(plugin.title || plugin.name) +
            ': ' +
            escapeHtml(String(error)) +
            '</div>'
        }
        return
      }

      content.innerHTML = ''
      const root = document.createElement('div')
      root.className = 'plugin-mount'
      content.appendChild(root)

      try {
        const cleanup = await panel.mount(root, context)
        if (!isCurrent()) {
          if (typeof cleanup === 'function') cleanup()
          return
        }
        if (typeof cleanup === 'function') pluginPanelDispose = cleanup
      } catch (error) {
        if (!isCurrent()) return
        root.innerHTML =
          '<div class="empty">Plugin panel failed: ' + escapeHtml(String(error)) + '</div>'
        console.error('[One DevTools] Plugin panel mounted with an error:', error)
      }
    }

    function registerPlugin(plugin) {
      if (!plugin || typeof plugin !== 'object' || !plugin.name) {
        console.warn('[One DevTools] Ignoring plugin without a name:', plugin)
        return
      }

      const pluginId = 'plugin:' + plugin.name
      for (let i = pluginItems.length - 1; i >= 0; i--) {
        if (pluginItems[i].pluginId === pluginId) pluginItems.splice(i, 1)
      }
      pluginPanels.delete(pluginId)

      const category = plugin.category || 'Plugins'

      if (plugin.panel) {
        pluginItems.push({
          id: pluginId,
          name: plugin.title || plugin.name,
          type: 'panel',
          category,
          pluginId,
        })
        pluginPanels.set(pluginId, { plugin, panel: plugin.panel })
      }

      if (Array.isArray(plugin.actions)) {
        plugin.actions.forEach((action, index) => {
          if (!action || typeof action.run !== 'function') return
          const actionId = pluginId + ':action:' + (action.id || index)
          const item = {
            id: actionId,
            name: action.title || action.id || 'Action ' + (index + 1),
            type: 'action',
            category: action.category || 'Actions',
            pluginId,
            pluginAction: action,
          }
          pluginItems.push(item)
        })
      }

      if (shadow) {
        renderTabs()
        if (activeTab === pluginId && panelDialog?.open) updateContent()
      }
    }

    window.__oneDevtools = window.__oneDevtools || {}
    window.__oneDevtools.registerPlugin = registerPlugin
    window.__oneDevtools.getPlugins = () =>
      Array.from(pluginPanels.values()).map((entry) => entry.plugin)

    const pendingPlugins = window.__oneDevtoolsPlugins || []
    pendingPlugins.forEach((plugin) => registerPlugin(plugin))
    pendingPlugins.push = function (...plugins) {
      plugins.forEach((plugin) => registerPlugin(plugin))
      return Array.prototype.push.apply(this, plugins)
    }
    window.__oneDevtoolsPlugins = pendingPlugins

    function getSeoContent() {
      const title = document.title || ''
      const desc =
        document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      const ogTitle =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
      const ogDesc =
        document
          .querySelector('meta[property="og:description"]')
          ?.getAttribute('content') || ''
      const ogImage =
        document.querySelector('meta[property="og:image"]')?.getAttribute('content') || ''

      const issues = []
      if (!title) issues.push({ type: 'error', msg: 'Missing title' })
      else if (title.length > 60)
        issues.push({ type: 'warn', msg: 'Title too long (>60)' })
      if (!desc) issues.push({ type: 'error', msg: 'Missing description' })
      else if (desc.length > 160)
        issues.push({ type: 'warn', msg: 'Description too long (>160)' })
      if (!ogTitle) issues.push({ type: 'warn', msg: 'Missing og:title' })
      if (!ogImage) issues.push({ type: 'warn', msg: 'Missing og:image' })

      let html = ''
      if (issues.length) {
        html += '<div class="section"><div class="section-title">Issues</div>'
        issues.forEach((i) => {
          html +=
            '<div class="issue-item"><span class="issue-icon">' +
            (i.type === 'error' ? '\u2716' : '\u26a0') +
            '</span><span>' +
            escapeHtml(i.msg) +
            '</span></div>'
        })
        html += '</div>'
      }

      html +=
        '<div class="section"><div class="section-title">Google Preview</div><div class="preview-card" style="background:#fff;color:#202124;padding:12px;border-radius:8px;">'
      html +=
        '<div style="font-size:12px;color:#202124;margin-bottom:2px;">' +
        escapeHtml(location.hostname) +
        '</div>'
      html +=
        '<div style="font-size:16px;color:#1a0dab;margin-bottom:4px;">' +
        escapeHtml(title || 'No title') +
        '</div>'
      html +=
        '<div style="font-size:13px;color:#4d5156;">' +
        escapeHtml(desc ? desc.slice(0, 160) : 'No description') +
        '</div>'
      html += '</div></div>'

      if (ogImage) {
        html += '<div class="section"><div class="section-title">Social Preview</div>'
        html +=
          '<div class="preview-card" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e1e8ed;">'
        html +=
          '<img src="' +
          escapeHtml(ogImage) +
          '" style="width:100%;height:auto;display:block;border-bottom:1px solid #e1e8ed;" onerror="this.style.display=\'none\'" />'
        html += '<div style="padding:12px;">'
        html +=
          '<div style="font-size:12px;color:#8899a6;text-transform:uppercase;margin-bottom:2px;">' +
          escapeHtml(location.hostname) +
          '</div>'
        html +=
          '<div style="font-size:15px;color:#1c2022;font-weight:700;margin-bottom:4px;line-height:1.3;">' +
          escapeHtml(ogTitle || title || 'No title') +
          '</div>'
        html +=
          '<div style="font-size:14px;color:#8899a6;line-height:1.3;">' +
          escapeHtml((ogDesc || desc || '').slice(0, 100)) +
          '</div>'
        html += '</div></div></div>'
      }

      html += '<div class="section"><div class="section-title">Meta Tags</div>'
      html +=
        '<div class="info-row"><div class="info-label">title</div><div class="info-value">' +
        escapeHtml(title || '-') +
        '</div></div>'
      html +=
        '<div class="info-row"><div class="info-label">description</div><div class="info-value">' +
        escapeHtml(desc || '-') +
        '</div></div>'
      html +=
        '<div class="info-row"><div class="info-label">og:title</div><div class="info-value">' +
        escapeHtml(ogTitle || '-') +
        '</div></div>'
      html +=
        '<div class="info-row"><div class="info-label">og:description</div><div class="info-value">' +
        escapeHtml(ogDesc || '-') +
        '</div></div>'
      html +=
        '<div class="info-row"><div class="info-label">og:image</div><div class="info-value">' +
        escapeHtml(ogImage || '-') +
        '</div></div>'
      html += '</div>'

      return html
    }

    function getRouteContent() {
      const pathname = location.pathname
      const segments = pathname.split('/').filter(Boolean)
      const search = location.search
      const hash = location.hash
      const devtools = window.__oneDevtools || {}
      const routeInfo = devtools.routeInfo || {}
      const params = routeInfo.params || {}

      let html = '<div class="section"><div class="section-title">Current Route</div>'
      html +=
        '<div class="info-row"><span class="info-label">pathname</span><span class="info-value">' +
        escapeHtml(pathname) +
        '</span></div>'
      html +=
        '<div class="info-row"><span class="info-label">segments</span><span class="info-value">' +
        (segments.length
          ? segments
              .map(
                (s) =>
                  '<span style="background:#252525;padding:2px 6px;border-radius:4px;margin-right:4px;">' +
                  escapeHtml(s) +
                  '</span>'
              )
              .join('')
          : '/') +
        '</span></div>'
      if (search)
        html +=
          '<div class="info-row"><span class="info-label">search</span><span class="info-value">' +
          escapeHtml(search) +
          '</span></div>'
      if (hash)
        html +=
          '<div class="info-row"><span class="info-label">hash</span><span class="info-value">' +
          escapeHtml(hash) +
          '</span></div>'
      html += '</div>'

      if (Object.keys(params).length) {
        html += '<div class="section"><div class="section-title">Route Params</div>'
        Object.entries(params).forEach(([k, v]) => {
          html +=
            '<div class="info-row"><span class="info-label">' +
            escapeHtml(k) +
            '</span><span class="info-value">' +
            escapeHtml(String(v)) +
            '</span></div>'
        })
        html += '</div>'
      }

      html += '<div class="section"><div class="section-title">Full URL</div>'
      html +=
        '<div style="font-family:monospace;font-size:11px;color:#666;word-break:break-all;">' +
        escapeHtml(location.href) +
        '</div>'
      html += '</div>'

      return html
    }

    function getLoaderContent() {
      const devtools = window.__oneDevtools || {}
      const history =
        typeof devtools.getLoaderTimingHistory === 'function'
          ? devtools.getLoaderTimingHistory() || []
          : []

      if (!history.length) {
        return '<div class="empty">No loader timings recorded yet</div>'
      }

      const maxTime = Math.max(...history.map((t) => t.totalTime || 0))
      let html = ''

      history.forEach((t) => {
        const modPct =
          t.moduleLoadTime && t.totalTime ? (t.moduleLoadTime / t.totalTime) * 100 : 0
        const execPct =
          t.executionTime && t.totalTime ? (t.executionTime / t.totalTime) * 100 : 0
        const widthPct = t.totalTime && maxTime ? (t.totalTime / maxTime) * 100 : 0

        html += '<div class="error-item' + (t.error ? ' error' : '') + '">'
        html +=
          '<div style="display:flex;justify-content:space-between;align-items:center;">'
        html +=
          '<span style="font-family:monospace;font-size:11px;">' +
          escapeHtml(t.path) +
          '</span>'
        html +=
          '<span class="badge badge-' +
          (t.error ? 'error' : 'success') +
          '">' +
          (t.totalTime ? Math.round(t.totalTime) + 'ms' : '-') +
          '</span>'
        html += '</div>'
        if (!t.error) {
          html +=
            '<div class="timing-bar" style="width:' + Math.max(20, widthPct) + '%;">'
          html +=
            '<div class="timing-segment timing-module" style="width:' +
            modPct +
            '%;" title="Module: ' +
            Math.round(t.moduleLoadTime || 0) +
            'ms"></div>'
          html +=
            '<div class="timing-segment timing-exec" style="width:' +
            execPct +
            '%;" title="Exec: ' +
            Math.round(t.executionTime || 0) +
            'ms"></div>'
          html += '</div>'
        }
        if (t.error) html += '<div class="error-msg">' + escapeHtml(t.error) + '</div>'
        html += '</div>'
      })

      return html
    }

    function getErrorsContent() {
      const devtools = window.__oneDevtools || {}
      const errors = devtools.errorHistory || []

      if (!errors.length) {
        return '<div class="empty">\u2713 No errors recorded</div>'
      }

      let html = ''
      errors.forEach((err) => {
        html += '<div class="error-item error">'
        html +=
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        html +=
          '<span class="badge badge-error">' + escapeHtml(err.type || 'error') + '</span>'
        html +=
          '<span style="font-size:11px;color:#666;">' +
          new Date(err.timestamp).toLocaleTimeString() +
          '</span>'
        html += '</div>'
        html +=
          '<div class="error-msg">' +
          escapeHtml(err.error?.message || 'Unknown error') +
          '</div>'
        html += '</div>'
      })

      return html
    }

    function initAfterHydration() {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => createHost(), { timeout: 3000 })
      } else {
        setTimeout(createHost, 100)
      }
    }

    if (document.readyState === 'complete') {
      initAfterHydration()
    } else {
      window.addEventListener('load', initAfterHydration)
    }

    window.addEventListener('one-loader-timing', () => {
      if (panelDialog?.open && activeTab === 'loader') updateContent()
    })

    window.addEventListener('one-error', (e) => {
      const devtools = (window.__oneDevtools = window.__oneDevtools || {})
      devtools.errorHistory = devtools.errorHistory || []
      devtools.errorHistory.unshift(e.detail)
      if (devtools.errorHistory.length > 20)
        devtools.errorHistory = devtools.errorHistory.slice(0, 20)
      if (panelDialog?.open && activeTab === 'errors') updateContent()
    })

    function onNavigate() {
      // Plugin panels keep their own state across app navigation.
      if (panelDialog?.open && !pluginPanels.has(activeTab)) updateContent()
    }
    window.addEventListener('popstate', onNavigate)
    window.addEventListener('one-hmr-update', onNavigate)

    const origPushState = history.pushState
    const origReplaceState = history.replaceState
    history.pushState = function (...args) {
      origPushState.apply(this, args)
      setTimeout(onNavigate, 0)
    }
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args)
      setTimeout(onNavigate, 0)
    }
  } catch (e) {
    console.error('[One DevTools] Failed to initialize:', e)
  }
})()
