/* ==========================================================
   通用工具：格式化、日期、血压分级、弹层、Toast
   ES5 only —— 不用 let/const/箭头函数/模板字符串
   ========================================================== */
(function (g) {
  'use strict';

  var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(s) {
    if (s === null || s === undefined) { return ''; }
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function today(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function nowTime() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtDate(s) {
    if (!s) { return ''; }
    var p = String(s).split('-');
    if (p.length < 3) { return s; }
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return (+p[1]) + '月' + (+p[2]) + '日 ' + WEEK[d.getDay()];
  }

  function fmtDateShort(s) {
    if (!s) { return ''; }
    var p = String(s).split('-');
    if (p.length < 3) { return s; }
    return (+p[1]) + '/' + (+p[2]);
  }

  function fmtMonth(s) {
    if (!s) { return ''; }
    var p = String(s).split('-');
    return p[0] + '年' + (+p[1]) + '月';
  }

  function daysBetween(a, b) {
    var d1 = new Date(a + 'T00:00:00');
    var d2 = new Date(b + 'T00:00:00');
    return Math.round((d2 - d1) / 86400000);
  }

  function num(v, digits) {
    if (v === null || v === undefined || v === '' || isNaN(v)) { return '—'; }
    return (+v).toFixed(digits === undefined ? 1 : digits);
  }

  function money(v) {
    var n = (v === null || v === undefined || v === '' || isNaN(v)) ? 0 : +v;
    var s = n.toFixed(2);
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '¥' + p.join('.');
  }

  function moneyShort(v) {
    var n = (v === null || v === undefined || v === '' || isNaN(v)) ? 0 : +v;
    var s = n.toFixed(0);
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // 血压分级（仅提示，不诊断）
  function bpLevel(sbp, dbp) {
    sbp = +sbp;
    dbp = +dbp;
    if (!sbp || !dbp) { return { cls: '', text: '' }; }
    if (sbp >= 180 || dbp >= 110) { return { cls: 'r', text: '很高' }; }
    if (sbp >= 140 || dbp >= 90) { return { cls: 'o', text: '偏高' }; }
    if (sbp < 90 || dbp < 60) { return { cls: 'y', text: '偏低' }; }
    if (sbp <= 139 && dbp <= 89) { return { cls: 'g', text: '正常' }; }
    return { cls: 'y', text: '需关注' };
  }

  function hrLevel(hr) {
    hr = +hr;
    if (!hr) { return { cls: '', text: '' }; }
    if (hr < 50) { return { cls: 'y', text: '偏慢' }; }
    if (hr > 100) { return { cls: 'y', text: '偏快' }; }
    return { cls: 'g', text: '正常' };
  }

  // 透析量：本次上机体重 − 上次下机体重
  function ufLevel(uf) {
    if (uf === null || uf === undefined || isNaN(uf)) { return { cls: '', text: '' }; }
    if (uf < 0) { return { cls: 'y', text: '比上次下机还轻，可能脱水过多或称重有误' }; }
    if (uf > 5) { return { cls: 'o', text: '超过 5 kg，请和护士核对' }; }
    if (uf > 3.5) { return { cls: 'y', text: '偏多，注意控制饮水' }; }
    return { cls: 'g', text: '在常见范围内' };
  }

  // ---------- Toast ----------
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('__toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '__toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, 2000);
  }

  // ---------- 底部弹层 ----------
  function openSheet(html, onMount) {
    var mask = document.createElement('div');
    mask.className = 'mask';
    mask.innerHTML = '<div class="sheet">' + html + '</div>';
    document.body.appendChild(mask);

    function close() {
      if (mask.parentNode) { mask.parentNode.removeChild(mask); }
      if (openClose === close) { openClose = null; }
    }

    openClose = close;

    mask.addEventListener('click', function (e) {
      if (e.target === mask) { close(); }
    });

    if (onMount) { onMount(mask.querySelector('.sheet'), close); }
    return close;
  }

  function confirmBox(title, msg, okText, onOk) {
    openSheet(
      '<h3>' + esc(title) + '</h3>' +
      '<div style="font-size:19px;font-weight:600;color:var(--ink2);margin-bottom:20px">' + esc(msg) + '</div>' +
      '<div class="gap10">' +
      '<button class="btn primary" data-ok>' + esc(okText || '确定') + '</button>' +
      '<button class="btn" data-cancel>取消</button>' +
      '</div>',
      function (sheet, close) {
        sheet.querySelector('[data-ok]').onclick = function () {
          close();
          if (onOk) { onOk(); }
        };
        sheet.querySelector('[data-cancel]').onclick = close;
      }
    );
  }

  function vibrate(ms) {
    try {
      if (g.Android && g.Android.vibrate) { g.Android.vibrate(ms || 20); }
      else if (navigator.vibrate) { navigator.vibrate(ms || 20); }
    } catch (e) {}
  }

  // 字符串数字键盘：只返回按钮，外层容器由页面提供（<div class="kp">）
  // noDot = true 时不带小数点（血压/心率用）
  function keypadHtml(noDot) {
    var keys = noDot
      ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']
      : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
    var h = '';
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === '') {
        h += '<button class="blank" disabled></button>';
      } else {
        h += '<button data-k="' + keys[i] + '">' + keys[i] + '</button>';
      }
    }
    return h;
  }

  var openClose = null;

  function closeSheet() {
    if (openClose) { openClose(); openClose = null; }
  }

  function applyKey(val, key) {
    if (key === '⌫') {
      return val.length > 0 ? val.substring(0, val.length - 1) : '';
    }
    if (key === '.') {
      if (val.indexOf('.') >= 0) { return val; }
      if (val === '') { return '0.'; }
      return val + '.';
    }
    if (val === '0') { val = ''; }
    if (val.length >= 7) { return val; }
    return val + key;
  }

  g.U = {
    $: $, $$: $$, esc: esc, pad: pad,
    today: today, nowTime: nowTime,
    fmtDate: fmtDate, fmtDateShort: fmtDateShort, fmtMonth: fmtMonth,
    daysBetween: daysBetween,
    num: num, money: money, moneyShort: moneyShort,
    bpLevel: bpLevel, hrLevel: hrLevel, ufLevel: ufLevel,
    toast: toast, openSheet: openSheet, closeSheet: closeSheet, confirm: confirmBox, vibrate: vibrate,
    keypadHtml: keypadHtml, applyKey: applyKey
  };
})(window);
