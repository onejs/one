// @ts-nocheck - This file contains inline JavaScript strings for client-side devtools
import { VIRTUAL_SSR_CSS_HREF } from '../constants'

// HMR script for route updates
const ROUTE_HMR_SCRIPT =
  'import { createHotContext } from "/@vite/client"; const hot = createHotContext("/__one_route_hmr"); hot.on("one:route-update", (data) => { if (window.__oneRouteCache) { if (data?.file) { window.__oneRouteCache.clearFile(data.file); } else { window.__oneRouteCache.clear(); } } window.dispatchEvent(new CustomEvent("one-hmr-update")); });'

// HMR script for loader data updates
const LOADER_HMR_SCRIPT =
  'import { createHotContext } from "/@vite/client"; const hot = createHotContext("/__one_loader_hmr"); hot.on("one:loader-data-update", async (data) => { if (data?.routePaths && window.__oneRefetchLoader) { const currentPath = window.location.pathname.replace(/\\/$/, "") || "/"; for (const routePath of data.routePaths) { if (routePath === currentPath) { try { await window.__oneRefetchLoader(routePath); } catch (err) { console.error("[one] Error refetching loader:", err); } } } } });'

// React refresh script
const REACT_REFRESH_SCRIPT =
  'import { injectIntoGlobalHook } from "/@react-refresh"; injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;'

// Unified One DevTools - All panels in one draggable window
// Alt+Space opens Spotlight-style quick picker
const ONE_DEVTOOLS_SCRIPT = `
(function() {
  try {
    var host = null;
    var shadow = null;
    var spotlight = null;
    var panel = null;
    var activeTab = 'seo';
    var isDragging = false;
    var dragOffset = { x: 0, y: 0 };
    var panelPos = { x: 20, y: 20 };
    var snappedEdge = { h: null, v: null };

    var LOGO_SVG = '<svg width="24" height="24" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#FCD34D" stroke="#222" stroke-width="2"/><circle cx="50" cy="35" r="16" fill="white"/><text x="50" y="41" text-anchor="middle" font-family="system-ui" font-size="16" font-weight="bold" fill="#222">1</text></svg>';

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function createHost() {
      if (host) return;
      host = document.createElement('div');
      host.id = 'one-devtools';
      shadow = host.attachShadow({ mode: 'open' });

      var css = \`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .spotlight {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: none;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(8px);
          background: rgba(0,0,0,0.4);
          opacity: 0;
          transition: opacity 0.12s ease-out;
        }
        .spotlight.visible { display: flex; opacity: 1; }

        .spotlight-box {
          background: #1a1a1a;
          border-radius: 12px;
          width: 320px;
          max-width: 90vw;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          transform: scale(0.96);
          opacity: 0;
          transition: transform 0.12s ease-out, opacity 0.12s ease-out;
        }
        .spotlight.visible .spotlight-box { transform: scale(1); opacity: 1; }

        .spotlight-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #252525;
          gap: 10px;
        }
        .spotlight-header svg { width: 20px; height: 20px; flex-shrink: 0; }
        .spotlight-header-title { font: 13px system-ui, sans-serif; color: #ccc; flex: 1; }
        .spotlight-header-version { font: 11px system-ui, sans-serif; color: #666; }

        .spotlight-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #ccc;
          font: 13px system-ui, sans-serif;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid #252525;
        }
        .spotlight-item:last-child { border-bottom: none; }
        .spotlight-item:hover { background: #252525; color: #fff; }
        .spotlight-item .key {
          background: #333;
          color: #888;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          margin-left: auto;
        }

        .panel {
          position: fixed;
          width: 420px;
          max-width: calc(100vw - 40px);
          max-height: calc(100vh - 40px);
          background: #161616;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 99998;
          display: none;
          flex-direction: column;
          overflow: hidden;
          font: 13px system-ui, sans-serif;
          color: #ccc;
        }
        .panel.visible { display: flex; }

        .panel-header {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: #1a1a1a;
          cursor: grab;
          user-select: none;
          gap: 8px;
        }
        .panel-header:active { cursor: grabbing; }
        .panel-header svg { width: 18px; height: 18px; }
        .panel-title { font-weight: 500; color: #999; font-size: 12px; flex: 1; }
        .panel-close {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 4px;
          font-size: 16px;
          line-height: 1;
        }
        .panel-close:hover { color: #fff; }

        .tabs {
          display: flex;
          background: #1a1a1a;
          padding: 0 8px;
          gap: 2px;
          overflow-x: auto;
        }
        .tab {
          padding: 8px 12px;
          background: none;
          border: none;
          color: #666;
          font: 12px system-ui, sans-serif;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.1s;
        }
        .tab:hover { color: #999; }
        .tab.active { color: #fff; border-bottom-color: #666; }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          min-height: 200px;
          max-height: calc(100vh - 140px);
        }

        .section { margin-bottom: 12px; }
        .section-title { font-size: 11px; color: #666; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

        .info-row {
          display: flex;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #222;
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #666; font-size: 11px; width: 90px; flex-shrink: 0; padding-top: 1px; }
        .info-value { color: #ccc; font-family: monospace; font-size: 12px; word-break: break-word; line-height: 1.4; flex: 1; }

        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          text-transform: uppercase;
        }
        .badge-error { background: #3a2020; color: #f87171; }
        .badge-warn { background: #3a3520; color: #fbbf24; }
        .badge-info { background: #202a3a; color: #60a5fa; }
        .badge-success { background: #1a3a20; color: #4ade80; }

        .empty { text-align: center; color: #555; padding: 24px; }

        .error-item {
          background: #1e1e1e;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 8px;
          border-left: 3px solid #666;
        }
        .error-item.error { border-left-color: #f87171; }
        .error-msg { color: #f87171; font-family: monospace; font-size: 12px; margin-top: 6px; }

        .timing-bar {
          height: 16px;
          background: #252525;
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          margin: 4px 0;
        }
        .timing-segment { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #fff; }
        .timing-module { background: #555; }
        .timing-exec { background: #888; }

        .preview-card {
          background: #1e1e1e;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 10px;
        }
        .preview-title { font-size: 11px; color: #666; margin-bottom: 6px; }

        .issue-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0;
          font-size: 12px;
        }
        .issue-icon { font-size: 10px; }
      \`;

      shadow.innerHTML = '<style>' + css + '</style><div class="spotlight" id="spotlight"><div class="spotlight-box" id="spotlight-box"></div></div><div class="panel" id="panel"></div>';
      document.body.appendChild(host);

      setupSpotlight();
      setupPanel();
      setupKeyboard();
    }

    function setupSpotlight() {
      spotlight = shadow.getElementById('spotlight');
      var box = shadow.getElementById('spotlight-box');

      var items = [
        { id: 'seo', name: 'SEO Preview', key: '⌥S' },
        { id: 'route', name: 'Route Info', key: '⌥R' },
        { id: 'loader', name: 'Loader Timing', key: '⌥L' },
        { id: 'errors', name: 'Errors', key: '⌥E' },
      ];

      var header = '<div class="spotlight-header">' + LOGO_SVG + '<span class="spotlight-header-title">Dev Tools</span><span class="spotlight-header-version">v1.2.57</span></div>';
      box.innerHTML = header + items.map(function(item) {
        return '<div class="spotlight-item" data-tab="' + item.id + '"><span>' + item.name + '</span><span class="key">' + item.key + '</span></div>';
      }).join('');

      box.addEventListener('click', function(e) {
        var item = e.target.closest('.spotlight-item');
        if (item) {
          activeTab = item.dataset.tab;
          hideSpotlight();
          showPanel();
        }
      });

      spotlight.addEventListener('click', function(e) {
        if (e.target === spotlight) hideSpotlight();
      });
    }

    function setupPanel() {
      panel = shadow.getElementById('panel');
      panel.innerHTML = '<div class="panel-header" id="panel-header">' + LOGO_SVG + '<span class="panel-title">DevTools</span><button class="panel-close" id="panel-close">×</button></div><div class="tabs" id="tabs"><button class="tab active" data-tab="seo">SEO</button><button class="tab" data-tab="route">Route</button><button class="tab" data-tab="loader">Loader</button><button class="tab" data-tab="errors">Errors</button></div><div class="content" id="content"></div>';

      shadow.getElementById('panel-close').addEventListener('click', hidePanel);

      var tabs = shadow.getElementById('tabs');
      tabs.addEventListener('click', function(e) {
        var tab = e.target.closest('.tab');
        if (tab) {
          activeTab = tab.dataset.tab;
          updateTabs();
          updateContent();
        }
      });

      setupDrag();
    }

    function setupDrag() {
      var header = shadow.getElementById('panel-header');

      header.addEventListener('mousedown', function(e) {
        if (e.target.closest('.panel-close')) return;
        isDragging = true;
        var rect = panel.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        // Store current position before resetting snap state
        panelPos.x = rect.left;
        panelPos.y = rect.top;
        snappedEdge = { h: null, v: null };
      });

      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        var x = e.clientX - dragOffset.x;
        var y = e.clientY - dragOffset.y;
        var snapDist = 20;
        var w = window.innerWidth;
        var h = window.innerHeight;
        var pw = panel.offsetWidth;
        var ph = panel.offsetHeight;
        var pad = 10;

        var snapH = null;
        var snapV = null;

        if (x < snapDist) { snapH = 'left'; }
        else if (x + pw > w - snapDist) { snapH = 'right'; }
        if (y < snapDist) { snapV = 'top'; }
        else if (y + ph > h - snapDist) { snapV = 'bottom'; }

        snappedEdge = { h: snapH, v: snapV };

        // Apply horizontal positioning
        if (snapH === 'left') {
          panel.style.left = pad + 'px';
          panel.style.right = 'auto';
        } else if (snapH === 'right') {
          panel.style.left = 'auto';
          panel.style.right = pad + 'px';
        } else {
          panel.style.left = x + 'px';
          panel.style.right = 'auto';
          panelPos.x = x;
        }

        // Apply vertical positioning
        if (snapV === 'top') {
          panel.style.top = pad + 'px';
          panel.style.bottom = 'auto';
        } else if (snapV === 'bottom') {
          panel.style.top = 'auto';
          panel.style.bottom = pad + 'px';
        } else {
          panel.style.top = y + 'px';
          panel.style.bottom = 'auto';
          panelPos.y = y;
        }
      });

      document.addEventListener('mouseup', function() {
        isDragging = false;
      });
    }

    function setupKeyboard() {
      document.addEventListener('keydown', function(e) {
        if (e.altKey && e.code === 'Space') {
          e.preventDefault();
          toggleSpotlight();
        } else if (e.altKey) {
          var tabMap = { KeyS: 'seo', KeyR: 'route', KeyL: 'loader', KeyE: 'errors' };
          var tab = tabMap[e.code];
          if (tab) {
            e.preventDefault();
            activeTab = tab;
            hideSpotlight();
            showPanel();
          }
        } else if (e.code === 'Escape') {
          if (spotlight.classList.contains('visible')) hideSpotlight();
          else if (panel.classList.contains('visible')) hidePanel();
        }
      });
    }

    function toggleSpotlight() {
      if (spotlight.classList.contains('visible')) hideSpotlight();
      else showSpotlight();
    }

    function showSpotlight() {
      if (!host) createHost();
      spotlight.classList.add('visible');
    }

    function hideSpotlight() {
      spotlight.classList.remove('visible');
    }

    function showPanel() {
      if (!host) createHost();
      var pad = 10;
      // Apply horizontal positioning based on snap state
      if (snappedEdge.h === 'left') {
        panel.style.left = pad + 'px';
        panel.style.right = 'auto';
      } else if (snappedEdge.h === 'right') {
        panel.style.left = 'auto';
        panel.style.right = pad + 'px';
      } else {
        panel.style.left = panelPos.x + 'px';
        panel.style.right = 'auto';
      }
      // Apply vertical positioning based on snap state
      if (snappedEdge.v === 'top') {
        panel.style.top = pad + 'px';
        panel.style.bottom = 'auto';
      } else if (snappedEdge.v === 'bottom') {
        panel.style.top = 'auto';
        panel.style.bottom = pad + 'px';
      } else {
        panel.style.top = panelPos.y + 'px';
        panel.style.bottom = 'auto';
      }
      panel.classList.add('visible');
      updateTabs();
      updateContent();
    }

    function hidePanel() {
      panel.classList.remove('visible');
    }

    function updateTabs() {
      shadow.querySelectorAll('.tab').forEach(function(t) {
        t.classList.toggle('active', t.dataset.tab === activeTab);
      });
    }

    function updateContent() {
      var content = shadow.getElementById('content');
      if (activeTab === 'seo') content.innerHTML = getSeoContent();
      else if (activeTab === 'route') content.innerHTML = getRouteContent();
      else if (activeTab === 'loader') content.innerHTML = getLoaderContent();
      else if (activeTab === 'errors') content.innerHTML = getErrorsContent();
    }

    function getSeoContent() {
      var title = document.title || '';
      var desc = document.querySelector('meta[name="description"]')?.content || '';
      var ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
      var ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';
      var ogImage = document.querySelector('meta[property="og:image"]')?.content || '';

      var issues = [];
      if (!title) issues.push({ type: 'error', msg: 'Missing title' });
      else if (title.length > 60) issues.push({ type: 'warn', msg: 'Title too long (>60)' });
      if (!desc) issues.push({ type: 'error', msg: 'Missing description' });
      else if (desc.length > 160) issues.push({ type: 'warn', msg: 'Description too long (>160)' });
      if (!ogTitle) issues.push({ type: 'warn', msg: 'Missing og:title' });
      if (!ogImage) issues.push({ type: 'warn', msg: 'Missing og:image' });

      var html = '';
      if (issues.length) {
        html += '<div class="section"><div class="section-title">Issues</div>';
        issues.forEach(function(i) {
          html += '<div class="issue-item"><span class="issue-icon">' + (i.type === 'error' ? '✖' : '⚠') + '</span><span>' + escapeHtml(i.msg) + '</span></div>';
        });
        html += '</div>';
      }

      html += '<div class="section"><div class="section-title">Google Preview</div><div class="preview-card" style="background:#fff;color:#202124;padding:12px;border-radius:8px;">';
      html += '<div style="font-size:12px;color:#202124;margin-bottom:2px;">' + escapeHtml(location.hostname) + '</div>';
      html += '<div style="font-size:16px;color:#1a0dab;margin-bottom:4px;">' + escapeHtml(title || 'No title') + '</div>';
      html += '<div style="font-size:13px;color:#4d5156;">' + escapeHtml(desc ? desc.slice(0,160) : 'No description') + '</div>';
      html += '</div></div>';

      html += '<div class="section"><div class="section-title">Meta Tags</div>';
      html += '<div class="info-row"><div class="info-label">title</div><div class="info-value">' + escapeHtml(title || '-') + '</div></div>';
      html += '<div class="info-row"><div class="info-label">description</div><div class="info-value">' + escapeHtml(desc || '-') + '</div></div>';
      html += '<div class="info-row"><div class="info-label">og:title</div><div class="info-value">' + escapeHtml(ogTitle || '-') + '</div></div>';
      html += '<div class="info-row"><div class="info-label">og:description</div><div class="info-value">' + escapeHtml(ogDesc || '-') + '</div></div>';
      html += '<div class="info-row"><div class="info-label">og:image</div><div class="info-value">' + escapeHtml(ogImage || '-') + '</div></div>';
      html += '</div>';

      return html;
    }

    function getRouteContent() {
      var pathname = location.pathname;
      var segments = pathname.split('/').filter(Boolean);
      var search = location.search;
      var hash = location.hash;
      var devtools = window.__oneDevtools || {};
      var routeInfo = devtools.routeInfo || {};
      var params = routeInfo.params || {};

      var html = '<div class="section"><div class="section-title">Current Route</div>';
      html += '<div class="info-row"><span class="info-label">pathname</span><span class="info-value">' + escapeHtml(pathname) + '</span></div>';
      html += '<div class="info-row"><span class="info-label">segments</span><span class="info-value">' + (segments.length ? segments.map(function(s) { return '<span style="background:#252525;padding:2px 6px;border-radius:4px;margin-right:4px;">' + escapeHtml(s) + '</span>'; }).join('') : '/') + '</span></div>';
      if (search) html += '<div class="info-row"><span class="info-label">search</span><span class="info-value">' + escapeHtml(search) + '</span></div>';
      if (hash) html += '<div class="info-row"><span class="info-label">hash</span><span class="info-value">' + escapeHtml(hash) + '</span></div>';
      html += '</div>';

      if (Object.keys(params).length) {
        html += '<div class="section"><div class="section-title">Route Params</div>';
        Object.entries(params).forEach(function(kv) {
          html += '<div class="info-row"><span class="info-label">' + escapeHtml(kv[0]) + '</span><span class="info-value">' + escapeHtml(String(kv[1])) + '</span></div>';
        });
        html += '</div>';
      }

      html += '<div class="section"><div class="section-title">Full URL</div>';
      html += '<div style="font-family:monospace;font-size:11px;color:#666;word-break:break-all;">' + escapeHtml(location.href) + '</div>';
      html += '</div>';

      return html;
    }

    function getLoaderContent() {
      var devtools = window.__oneDevtools || {};
      var history = typeof devtools.getLoaderTimingHistory === 'function' ? devtools.getLoaderTimingHistory() || [] : [];

      if (!history.length) {
        return '<div class="empty">No loader timings recorded yet</div>';
      }

      var maxTime = Math.max.apply(null, history.map(function(t) { return t.totalTime || 0; }));
      var html = '';

      history.forEach(function(t) {
        var modPct = t.moduleLoadTime && t.totalTime ? (t.moduleLoadTime / t.totalTime) * 100 : 0;
        var execPct = t.executionTime && t.totalTime ? (t.executionTime / t.totalTime) * 100 : 0;
        var widthPct = t.totalTime && maxTime ? (t.totalTime / maxTime) * 100 : 0;

        html += '<div class="error-item' + (t.error ? ' error' : '') + '">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-family:monospace;font-size:11px;">' + escapeHtml(t.path) + '</span>';
        html += '<span class="badge badge-' + (t.error ? 'error' : 'success') + '">' + (t.totalTime ? Math.round(t.totalTime) + 'ms' : '-') + '</span>';
        html += '</div>';
        if (!t.error) {
          html += '<div class="timing-bar" style="width:' + Math.max(20, widthPct) + '%;">';
          html += '<div class="timing-segment timing-module" style="width:' + modPct + '%;" title="Module: ' + Math.round(t.moduleLoadTime || 0) + 'ms"></div>';
          html += '<div class="timing-segment timing-exec" style="width:' + execPct + '%;" title="Exec: ' + Math.round(t.executionTime || 0) + 'ms"></div>';
          html += '</div>';
        }
        if (t.error) html += '<div class="error-msg">' + escapeHtml(t.error) + '</div>';
        html += '</div>';
      });

      return html;
    }

    function getErrorsContent() {
      var devtools = window.__oneDevtools || {};
      var errors = devtools.errorHistory || [];

      if (!errors.length) {
        return '<div class="empty">✓ No errors recorded</div>';
      }

      var html = '';
      errors.forEach(function(err) {
        html += '<div class="error-item error">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
        html += '<span class="badge badge-error">' + escapeHtml(err.type || 'error') + '</span>';
        html += '<span style="font-size:11px;color:#666;">' + new Date(err.timestamp).toLocaleTimeString() + '</span>';
        html += '</div>';
        html += '<div class="error-msg">' + escapeHtml(err.error?.message || 'Unknown error') + '</div>';
        html += '</div>';
      });

      return html;
    }

    // Initialize
    createHost();

    // Listen for events
    window.addEventListener('one-loader-timing', function() {
      if (panel && panel.classList.contains('visible') && activeTab === 'loader') updateContent();
    });
    window.addEventListener('one-error', function(e) {
      var devtools = window.__oneDevtools = window.__oneDevtools || {};
      devtools.errorHistory = devtools.errorHistory || [];
      devtools.errorHistory.unshift(e.detail);
      if (devtools.errorHistory.length > 20) devtools.errorHistory = devtools.errorHistory.slice(0, 20);
      if (panel && panel.classList.contains('visible') && activeTab === 'errors') updateContent();
    });

    // Update on navigation
    function onNavigate() {
      if (panel && panel.classList.contains('visible')) updateContent();
    }
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('one-hmr-update', onNavigate);
    // Also catch pushState/replaceState
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function() {
      origPushState.apply(this, arguments);
      setTimeout(onNavigate, 0);
    };
    history.replaceState = function() {
      origReplaceState.apply(this, arguments);
      setTimeout(onNavigate, 0);
    };

  } catch (e) {
    console.error('[One DevTools] Failed to initialize:', e);
  }
})();
`

// Source Inspector script - shows source location on hover when holding Option for 1s
const SOURCE_INSPECTOR_SCRIPT = `
(function() {
  try {
    var active = false;
    var overlay = null;
    var tag = null;
    var holdTimer = null;
    var holdDelay = 1000;

    function createOverlay() {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:10000;background:rgba(100,100,100,0.2);border:2px solid rgba(100,100,100,0.6);border-radius:2px;transition:all 0.05s';
      document.body.appendChild(overlay);
      tag = document.createElement('div');
      tag.style.cssText = 'position:fixed;pointer-events:none;z-index:10001;background:rgba(60,60,60,0.9);color:white;padding:4px 8px;font-size:12px;font-family:system-ui;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2)';
      document.body.appendChild(tag);
    }

    function hideOverlay() {
      if (overlay) overlay.style.display = 'none';
      if (tag) tag.style.display = 'none';
    }

    function showOverlay(el, source) {
      if (!overlay) createOverlay();
      var rect = el.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      tag.style.display = 'block';
      tag.textContent = source;
      var top = rect.top - 28;
      if (top < 0) top = rect.bottom + 4;
      tag.style.top = top + 'px';
      tag.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 200)) + 'px';
    }

    function cancelHold() {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    function activate() {
      active = true;
    }

    function deactivate() {
      cancelHold();
      active = false;
      hideOverlay();
    }

    window.addEventListener('keydown', function(e) {
      // Only trigger on Alt/Option key held alone
      if (e.key !== 'Alt') {
        cancelHold();
        return;
      }
      // Ignore if other modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        cancelHold();
        return;
      }
      if (e.defaultPrevented) return;
      if (holdTimer) return; // already waiting
      holdTimer = setTimeout(activate, holdDelay);
    });

    window.addEventListener('keyup', function(e) {
      if (e.defaultPrevented) return;
      deactivate();
    });

    window.addEventListener('blur', deactivate);

    document.addEventListener('mousemove', function(e) {
      if (!active) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      while (el && !el.hasAttribute('data-one-source')) el = el.parentElement;
      if (el) {
        var source = el.getAttribute('data-one-source');
        // Parse source and look up actual line:column
        var lastColon = source.lastIndexOf(':');
        var filePath = source.slice(0, lastColon);
        var idx = source.slice(lastColon + 1);
        var info = window.__oneSourceInfo && window.__oneSourceInfo[filePath];
        var lineCol = info && info[idx];
        var displaySource = lineCol ? filePath + ':' + lineCol[0] + ':' + lineCol[1] : source;
        showOverlay(el, displaySource);
      }
      else hideOverlay();
    });

    document.addEventListener('click', function(e) {
      if (!active) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      while (el && !el.hasAttribute('data-one-source')) el = el.parentElement;
      if (el) {
        e.preventDefault();
        e.stopPropagation();
        var source = el.getAttribute('data-one-source');
        // Parse source: "/path/to/file.tsx:index"
        var lastColon = source.lastIndexOf(':');
        var filePath = source.slice(0, lastColon);
        var idx = source.slice(lastColon + 1);
        // Look up actual line/column from source info
        var info = window.__oneSourceInfo && window.__oneSourceInfo[filePath];
        var lineCol = info && info[idx];
        var url = '/__one/open-source?source=' + encodeURIComponent(source);
        if (lineCol) {
          url += '&line=' + lineCol[0] + '&column=' + lineCol[1];
        }
        fetch(url);
      }
    }, true);
  } catch (e) {
    console.error('[Source Inspector] Failed to initialize:', e);
  }
})();
`

export function DevHead() {
  if (process.env.TAMAGUI_TARGET === 'native') {
    return null
  }
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        <link rel="preload" href={VIRTUAL_SSR_CSS_HREF} as="style" />
        <link
          rel="stylesheet"
          href={VIRTUAL_SSR_CSS_HREF}
          data-ssr-css
          suppressHydrationWarning
        />
        <script
          type="module"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: ROUTE_HMR_SCRIPT }}
        />
        <script
          type="module"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: LOADER_HMR_SCRIPT }}
        />
        <script
          type="module"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: REACT_REFRESH_SCRIPT }}
        />
        {/* Unified One DevTools */}
        <script
          type="module"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: ONE_DEVTOOLS_SCRIPT }}
        />
        {/* Source Inspector - hold Option for 1s then hover */}
        <script
          type="module"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: SOURCE_INSPECTOR_SCRIPT }}
        />
      </>
    )
  }
  return null
}
