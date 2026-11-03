/* ==========================================================
   页面组二：拍照 / 确认数字 / 开药 / 药品库
   ES5 only
   ========================================================== */
(function (g) {
  'use strict';

  var U = g.U, S = g.Store;
  var P = g.P1;

  function top(o) {
    var back = o.back ? '<div class="back" data-back="1"><svg viewBox="0 0 24 24" fill="none" stroke="#2E2418" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>' : '';
    var h = '<div class="bar">' + back + '<div class="grow"><h1>' + o.title + '</h1>';
    if (o.sub) { h += '<div class="sub">' + o.sub + '</div>'; }
    h += '</div>';
    if (o.act) { h += '<div class="act" data-act="' + o.actKey + '">' + o.act + '</div>'; }
    h += '</div>';
    return h;
  }

  function go(hash) { location.hash = hash; }

  // ============================ 拍照 ============================
  P.camera = function (page, q) {
    var scene = q.scene === 'bp' ? 'bp' : 'weight';
    var side = q.side === 'down' ? 'down' : 'up';
    var date = q.date || U.today();
    var shift = q.shift === 'pm' ? 'pm' : 'am';

    g.__camCtx = { scene: scene, side: side, date: date, shift: shift };

    var isBp = scene === 'bp';
    var h = '<div class="cam">';
    h += '<div class="top">';
    h += '<div class="t1">' + (isBp ? '把血压计的数字放进框里' : '把体重秤的数字放进框里') + '</div>';
    h += '<div class="t2">手机拿稳，离数字 20–40 厘米</div>';
    h += '</div>';
    h += '<div class="view">';
    h += '<div class="demo">' + (isBp ? '152' : '100.0') + '</div>';
    h += '<div class="frame"></div>';
    h += '</div>';
    h += '<div class="shot">';
    h += '<div class="side" id="album"><svg viewBox="0 0 24 24" fill="none" stroke="#E8D9BE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l4.5-4.5 3 3 3-2.5L20 17"/></svg></div>';
    h += '<div class="main" id="shoot">拍</div>';
    h += '<div class="side" id="manual"><svg viewBox="0 0 24 24" fill="none" stroke="#E8D9BE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4 16.5V20z"/><path d="M13 6l3.5 3.5"/></svg></div>';
    h += '</div>';
    h += '<div class="hint">看不清？可以 <span style="color:#F5B942">手动输入</span></div>';
    h += '</div>';
    page.innerHTML = h;

    var tipEl = page.querySelector('.hint');

    page.querySelector('#shoot').onclick = function () {
      if (g.Android && g.Android.takePhoto) {
        g.Android.takePhoto();
      } else {
        U.toast('请用手机打开才能拍照');
      }
    };

    page.querySelector('#album').onclick = function () {
      if (g.Android && g.Android.pickPhoto) {
        g.Android.pickPhoto();
      } else {
        U.toast('请用手机打开才能选照片');
      }
    };

    page.querySelector('#manual').onclick = function () {
      go(isBp ? ('#bp?side=' + side + '&date=' + date + '&shift=' + shift)
              : ('#weight?side=' + side + '&date=' + date + '&shift=' + shift));
    };

    tipEl.onclick = function () {
      go(isBp ? ('#bp?side=' + side + '&date=' + date + '&shift=' + shift)
              : ('#weight?side=' + side + '&date=' + date + '&shift=' + shift));
    };
  };

  // ============================ 确认数字 ============================
  P.confirm = function (page) {
    var photo = g.__photo;
    var ctx = g.__camCtx || { scene: 'weight', side: 'up', date: U.today(), shift: 'am' };

    var h = '<div class="page">';
    h += top({ title: '确认数字', sub: '点数字可以改', back: true });
    h += '<div class="scroll" id="cw">';
    h += '<div class="empty">正在识别…</div>';
    h += '</div></div>';
    page.innerHTML = h;

    var wrap = page.querySelector('#cw');

    function fail(msg) {
      wrap.innerHTML = '<div class="tip o"><span class="dot"></span><span>' + msg +
        '</span></div><button class="btn primary mt16" id="man">手动输入</button>' +
        '<button class="btn mt12" id="again">重新拍一张</button>';
      wrap.querySelector('#man').onclick = function () { toManual(); };
      wrap.querySelector('#again').onclick = function () { go('#camera?scene=' + ctx.scene + '&side=' + ctx.side); };
    }

    function toManual() {
      if (ctx.scene === 'bp') {
        go('#bp?side=' + ctx.side + '&date=' + ctx.date + '&shift=' + ctx.shift);
      } else {
        go('#weight?side=' + ctx.side + '&date=' + ctx.date + '&shift=' + ctx.shift);
      }
    }

    if (!photo) {
      fail('还没有照片，请重新拍一张');
      return;
    }

    var img = new Image();
    img.onload = function () {
      var r;
      try {
        r = g.OCR.recognize(img, 760);
      } catch (e) {
        r = { ok: false, lines: [] };
      }
      renderResult(img, r);
    };
    img.onerror = function () { fail('照片读不出来，请重新拍一张'); };
    img.src = photo;

    function renderResult(img, r) {
      var lines = (r && r.lines) ? r.lines : [];
      var vals = [];
      for (var i = 0; i < lines.length; i++) {
        var t = lines[i].text.replace(/[^0-9.]/g, '');
        if (t.replace(/\./g, '').length >= 2) { vals.push(t); }
      }

      var conf = (r && r.conf) || 0;
      var okBadge = (vals.length && conf >= 0.6)
        ? '<span class="badge">识别很清晰</span>'
        : '<span class="badge y">识别有点模糊，请核对</span>';

      var h = '';
      h += '<div style="position:relative;border-radius:20px;overflow:hidden;background:#241C14">';
      h += '<img src="' + photo + '" style="width:100%;display:block">';
      h += '<div style="position:absolute;left:12px;top:12px;background:#F5B942;color:#3A2A08;font-size:14px;font-weight:800;padding:5px 12px;border-radius:9px">拍到的照片</div>';
      h += '</div>';
      h += '<div class="center mt12">' + okBadge + '</div>';

      if (ctx.scene === 'bp') {
        h += '<div id="bpv" class="mt12"></div>';
      } else {
        var v0 = vals[0] || '';
        h += '<div class="mt12"><div class="cells" id="cells"></div>';
        h += '<div class="center lbl mt8">单位：kg</div></div>';
      }

      h += '<div id="ufbox" class="mt12"></div>';
      h += '<button class="btn primary mt16" id="ok">确认记入</button>';
      h += '<button class="btn mt12" id="again">重拍一张</button>';
      wrap.innerHTML = h;

      var state = { weight: vals[0] || '' };

      if (ctx.scene === 'bp') {
        drawBpVals(vals);
      } else {
        drawCells(state.weight);
        showUF(state.weight);
      }

      wrap.querySelector('#again').onclick = function () {
        go('#camera?scene=' + ctx.scene + '&side=' + ctx.side);
      };

      wrap.querySelector('#ok').onclick = function () {
        save(state);
      };

      function drawCells(str) {
        var cells = wrap.querySelector('#cells');
        if (!cells) { return; }
        var hh = '';
        var chars = str.split('');
        for (var i = 0; i < chars.length; i++) {
          var c = chars[i];
          if (c === '.') {
            hh += '<div class="c dotc"><span class="dp"></span></div>';
          } else {
            hh += '<div class="c">' + c + '</div>';
          }
        }
        cells.innerHTML = hh;
        cells.onclick = function () { editWeight(); };
      }

      function editWeight() {
        var html = '<h3>改成正确的数字</h3>';
        html += '<div class="disp"><span class="big" id="ev">' + (state.weight || '0') + '</span><span class="unit">kg</span></div>';
        html += '<div class="kp mt12" id="ekp">' + U.keypadHtml() + '</div>';
        html += '<button class="btn primary mt12" id="eok">确定</button>';
        U.openSheet(html, function (sh, close) {
          var cur = state.weight;
          sh.querySelector('#ekp').onclick = function (e) {
            var b = e.target.closest('button');
            if (!b) { return; }
            cur = U.applyKey(cur, b.getAttribute('data-k'));
            sh.querySelector('#ev').textContent = cur || '0';
          };
          sh.querySelector('#eok').onclick = function () {
            state.weight = cur;
            close();
            drawCells(cur);
            showUF(cur);
          };
        });
      }

      function showUF(str) {
        var box = wrap.querySelector('#ufbox');
        var v = parseFloat(str);
        if (!v || isNaN(v)) { box.innerHTML = ''; return; }
        if (ctx.side !== 'up') {
          box.innerHTML = '<div class="tip g"><span class="dot"></span><span>下机体重 ' + v.toFixed(1) + ' kg</span></div>';
          return;
        }
        var rr = S.calcUF(ctx.date, v);
        if (!rr || !rr.prevWeight) {
          box.innerHTML = '<div class="tip g"><span class="dot"></span><span>第一次记录上机体重</span></div>';
          return;
        }
        var uf = Math.round((v - rr.prevWeight) * 10) / 10;
        var msg = uf < 0 ? '比上次下机还轻，请核对' : ('本次预计排水 ' + uf.toFixed(1) + ' kg');
        box.innerHTML = '<div class="tip ' + (uf < 0 ? 'o' : 'g') + '"><span class="dot"></span><span>上次下机体重 ' +
          rr.prevWeight.toFixed(1) + ' kg（' + U.fmtDateShort(rr.prevDate) + '）<br>' + msg + '</span></div>';
      }

      function drawBpVals(arr) {
        var box = wrap.querySelector('#bpv');
        var v = assignBp(arr);
        var hh = '<div class="gap10" style="display:block">';
        hh += row('sbp', '高压', v.sbp, 'mmHg');
        hh += row('dbp', '低压', v.dbp, 'mmHg');
        hh += row('hr', '心率', v.hr, '次/分');
        hh += '</div>';
        box.innerHTML = hh;
        U.$$('.bprow', box).forEach(function (r) {
          r.onclick = function () {
            var f = r.getAttribute('data-f');
            editOne(f);
          };
        });

        function row(f, name, val, unit) {
          return '<div class="bprow" data-f="' + f + '"><span class="n">' + name + '</span>' +
            '<span class="v">' + (val || '—') + '</span><span class="u">' + unit + '</span></div>';
        }

        function editOne(f) {
          var html = '<h3>输入' + (f === 'sbp' ? '高压' : f === 'dbp' ? '低压' : '心率') + '</h3>';
          html += '<div class="disp"><span class="big" id="ev">' + (v[f] || '0') + '</span></div>';
          html += '<div class="kp mt12" id="ekp"><button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>' +
            '<button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>' +
            '<button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>' +
            '<button data-k="0">0</button><button data-k="00">00</button><button data-k="⌫">⌫</button></div>';
          html += '<button class="btn primary mt12" id="eok">确定</button>';
          U.openSheet(html, function (sh, close) {
            var cur = v[f] ? String(v[f]) : '';
            sh.querySelector('#ekp').onclick = function (e) {
              var b = e.target.closest('button');
              if (!b) { return; }
              var k = b.getAttribute('data-k');
              if (k === '⌫') { cur = cur.slice(0, -1); }
              else if (k === '00') { if (cur.length < 3) { cur += '00'; } }
              else { if (cur.length < 3) { cur = (cur === '0' ? '' : cur) + k; } }
              sh.querySelector('#ev').textContent = cur || '0';
            };
            sh.querySelector('#eok').onclick = function () {
              v[f] = parseInt(cur, 10) || 0;
              close();
              drawBpVals([]);
            };
          });
        }

        function assignBp(arr) {
          var out = { sbp: 0, dbp: 0, hr: 0 };
          if (!arr || !arr.length) { return out; }
          // 按出现顺序：高压 / 低压 / 心率
          var n = [];
          for (var i = 0; i < arr.length && i < 3; i++) {
            n.push(parseInt(arr[i], 10) || 0);
          }
          if (n.length === 1) {
            // 只有一个数字时按数值猜
            if (n[0] >= 60) { out.sbp = n[0]; }
          } else if (n.length === 2) {
            out.sbp = n[0]; out.dbp = n[1];
          } else {
            out.sbp = n[0]; out.dbp = n[1]; out.hr = n[2];
          }
          return out;
        }
      }

      function save(state) {
        if (ctx.scene === 'bp') {
          var v = {};
          U.$$('.bprow', wrap).forEach(function (r) {
            var f = r.getAttribute('data-f');
            var t = r.querySelector('.v').textContent;
            v[f] = parseInt(t, 10) || 0;
          });
          if (!v.sbp || !v.dbp) { U.toast('请补上高压和低压'); return; }
          S.upsertSession(ctx.date, ctx.shift, ctx.side, { time: U.nowTime(), sbp: v.sbp, dbp: v.dbp, hr: v.hr || 0 });
          U.toast('血压已记入');
        } else {
          var w = parseFloat(state.weight);
          if (!w || w < 20 || w > 300) { U.toast('体重数值不对，请改一下'); return; }
          S.upsertSession(ctx.date, ctx.shift, ctx.side, { time: U.nowTime(), weight: Math.round(w * 10) / 10 });
          U.toast('体重已记入');
        }
        U.vibrate(30);
        g.__photo = null;
        setTimeout(function () { go('#home'); }, 500);
      }
    }
  };
})(window);
