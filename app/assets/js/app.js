/* ==========================================================
   应用入口：hash 路由 + 底部导航 + 原生回调 + 字体档位
   ES5 only
   ========================================================== */
(function (g) {
  'use strict';

  var U = g.U, S = g.Store;
  var app = document.getElementById('app');
  var curHash = '';

  var FONT = { 'fs-1': 1, 'fs-2': 1.1, 'fs-3': 1.24 };

  var ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
    weight: '<svg viewBox="0 0 24 24"><path d="M3 17l4.5-6 3.5 4 3-5 6.5 7"/><path d="M3 21h18"/></svg>',
    bp: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/></svg>',
    med: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M8 6V4h8v2"/><path d="M12 10v6M9 13h6"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.2-2h6.2l1.2 2h1.7A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.7" r="3.4"/></svg>'
  };

  var ROUTES = {
    home: function (page, q) { g.P1.home(page, q); },
    weight: function (page, q) { g.P1.weight(page, q); },
    weightHist: function (page, q) { g.P1.weightHist(page, q); },
    trend: function (page, q) { g.P1.trend(page, q); },
    bp: function (page, q) { g.P1.bp(page, q); },
    bpHist: function (page, q) { g.P1.bpHist(page, q); },
    camera: function (page, q) { g.P1.camera(page, q); },
    confirm: function (page, q) { g.P1.confirm(page, q); },
    med: function (page, q) { g.P1.med(page, q); },
    stats: function (page, q) { g.P1.stats(page, q); },
    settings: function (page, q) { g.P1.settings(page, q); }
  };

  // 路由 → 底部导航高亮项（空 = 隐藏导航）
  var NAV_OF = {
    home: 'home',
    weight: '',
    weightHist: 'weight',
    trend: 'weight',
    bp: '',
    bpHist: 'bp',
    med: 'med',
    stats: 'med',
    camera: '',
    confirm: '',
    settings: ''
  };

  function parseQuery(s) {
    var out = {};
    if (!s) { return out; }
    var p = s.split('&');
    for (var i = 0; i < p.length; i++) {
      var kv = p[i].split('=');
      if (kv[0]) { out[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }
    }
    return out;
  }

  function navHtml(active) {
    var items = [
      ['home', '首页', ICON.home, ''],
      ['weightHist', '体重', ICON.weight, ''],
      ['__cam', '', ICON.cam, 'mid'],
      ['bpHist', '血压', ICON.bp, ''],
      ['med', '开药', ICON.med, '']
    ];
    var h = '<div class="nav">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it[3] === 'mid') {
        h += '<div class="mid" data-h="camera?scene=weight&side=up">' + it[2] + '</div>';
      } else {
        h += '<div class="it' + (active === it[0] ? ' on' : '') + '" data-h="' + it[0] + '">' + it[2] + '<span>' + it[1] + '</span></div>';
      }
    }
    return h + '</div>';
  }

  function route() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) { raw = 'home'; }
    curHash = raw;

    var parts = raw.split('?');
    var name = parts[0];
    var q = parseQuery(parts[1] || '');
    var fn = ROUTES[name] || ROUTES.home;

    app.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'page';
    app.appendChild(page);

    var navKey = NAV_OF.hasOwnProperty(name) ? NAV_OF[name] : '';
    if (navKey) {
      var wrap = document.createElement('div');
      wrap.innerHTML = navHtml(navKey);
      var navEl = wrap.firstChild;
      navEl.onclick = function (e) {
        var t = e.target.closest('[data-h]');
        if (!t) { return; }
        var hh = t.getAttribute('data-h');
        if (location.hash === '#' + hh) { return; }
        location.hash = hh;
      };
      app.appendChild(navEl);
    }

    try {
      fn(page, q);
    } catch (err) {
      page.innerHTML = '<div class="empty">页面出错了：' + U.esc(String(err && err.message || err)) + '</div>';
    }

    // 顶部返回
    bindBack(page);
    window.scrollTo(0, 0);
  }

  function bindBack(page) {
    var b = page.querySelector('[data-back]');
    if (b) {
      b.onclick = function () { history.back(); };
    }
    U.$$('[data-go]', page).forEach(function (el) {
      el.onclick = function () {
        var hh = el.getAttribute('data-go');
        location.hash = hh;
      };
    });
  }

  // ---------------- 原生回调 ----------------
  g.__onPhotoData = function (url) {
    g.__photo = url;
    if (location.hash === '#confirm') { route(); }
    else { location.hash = 'confirm'; }
  };

  g.__onPhotoError = function (msg) {
    U.toast(msg || '拍照失败，请再试一次');
  };

  g.__onPhotoCancel = function () { };

  // 返回键：'1' = 应用内已处理，'0' = 退出
  g.__onBack = function () {
    var name = curHash.split('?')[0];
    if (name && name !== 'home') {
      if (history.length > 1) { history.back(); }
      else { location.hash = 'home'; }
      return '1';
    }
    return '0';
  };

  // ---------------- 字体 ----------------
  g.applyFont = function (fs) {
    if (!FONT[fs]) { fs = 'fs-2'; }
    document.body.className = fs;
  };

  // ---------------- 启动 ----------------
  function boot() {
    var st = {};
    try { st = S.settings() || {}; } catch (e) { st = {}; }
    g.applyFont(st.fontSize || 'fs-2');
    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
