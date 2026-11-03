/* ==========================================================
   页面组一：首页 / 体重录入 / 体重历史 / 趋势 / 血压录入 / 血压历史
   ES5 only
   ========================================================== */
(function (g) {
  'use strict';

  var U = g.U, S = g.Store;
  var P = {};

  var ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="#2E2418" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="#6E5B44" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.2 14.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.7 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H2.6a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56V2.6a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1.03z"/></svg>'
  };

  function top(o) {
    var h = '<div class="bar">';
    if (o.back) {
      h += '<div class="back" data-back="1">' + ICON.back + '</div>';
    }
    h += '<div class="grow">';
    h += '<h1>' + o.title + '</h1>';
    if (o.sub) { h += '<div class="sub">' + o.sub + '</div>'; }
    h += '</div>';
    if (o.act) {
      h += '<div class="act" data-act="' + o.actKey + '">' + o.act + '</div>';
    } else if (o.gear) {
      h += '<div class="back" data-go="settings">' + ICON.gear + '</div>';
    }
    h += '</div>';
    return h;
  }

  function go(hash) {
    location.hash = hash;
  }

  // ============================ 首页 ============================
  function lastComplete() {
    var ss = S.sessions();
    for (var i = ss.length - 1; i >= 0; i--) {
      var s = ss[i];
      if (s.up && s.up.weight && s.down && s.down.weight) { return s; }
    }
    return null;
  }

  function lastBpEntry() {
    var ss = S.sessions();
    for (var i = ss.length - 1; i >= 0; i--) {
      var s = ss[i];
      if (s.down && s.down.sbp) { return { s: s, where: '下机时', v: s.down }; }
      if (s.up && s.up.sbp) { return { s: s, where: '上机时', v: s.up }; }
    }
    return null;
  }

  function greeting() {
    var hh = new Date().getHours();
    if (hh < 6) { return '夜深了'; }
    if (hh < 11) { return '早上好'; }
    if (hh < 14) { return '中午好'; }
    if (hh < 18) { return '下午好'; }
    return '晚上好';
  }

  P.home = function (page) {
    var st = S.settings();
    var name = st.patientName || '您';
    var d = U.today();
    var ss = S.sessions();
    var todayS = S.getSession(d, 'am') || S.getSession(d, 'pm');
    var hasToday = !!(todayS && (todayS.up || todayS.down));

    var h = '<div class="page">';
    h += top({
      title: greeting() + '，' + U.esc(name),
      sub: U.fmtDate(d) + ' · ' + (hasToday ? '今天的记录已开始' : '点下面的按钮开始记录'),
      gear: true
    });
    h += '<div class="scroll">';

    // 本次排水
    var c = lastComplete();
    if (c) {
      var up = c.up.weight, dn = c.down.weight;
      var uf = Math.round((up - dn) * 10) / 10;
      var lv = U.ufLevel(uf);
      h += '<div class="hero">';
      h += '<div class="lbl">本次透析排水</div>';
      h += '<div class="big" style="margin-top:6px">' + uf.toFixed(1) + '<span class="unit">kg</span></div>';
      h += '<div class="pair">';
      h += '<div>上机 ' + up.toFixed(1) + ' kg</div>';
      h += '<div>下机 ' + dn.toFixed(1) + ' kg</div>';
      h += '</div>';
      if (lv.tone !== 'g') {
        h += '<div class="tiny mt8" style="color:#8A5A00">' + lv.text + '</div>';
      } else {
        h += '<div class="tiny mt8" style="color:#8A5A00">实际脱水量以医生处方为准</div>';
      }
      h += '</div>';
    } else {
      h += '<div class="hero">';
      h += '<div class="lbl">本次透析排水</div>';
      h += '<div class="empty" style="padding:22px 0">还没有完整的一次上机 + 下机记录</div>';
      h += '</div>';
    }

    // 最近血压
    var b = lastBpEntry();
    h += '<div class="card mt12">';
    if (b) {
      var lv2 = U.bpLevel(b.v.sbp, b.v.dbp);
      h += '<div class="row"><div class="lbl grow">最近血压</div>';
      h += '<span class="badge ' + lv2.tone + '">' + lv2.text + '</span></div>';
      h += '<div class="row" style="align-items:baseline;margin-top:2px">';
      h += '<div class="big" style="color:var(--ink)">' + b.v.sbp + '/' + b.v.dbp + '</div>';
      if (b.v.hr) {
        h += '<div class="lbl" style="margin-left:auto;padding-bottom:6px">心率 ' + b.v.hr + '</div>';
      }
      h += '</div>';
      h += '<div class="tiny muted">' + U.fmtDateShort(b.s.date) + ' ' + b.where + '测</div>';
    } else {
      h += '<div class="lbl">最近血压</div>';
      h += '<div class="empty" style="padding:18px 0">还没有记录</div>';
    }
    h += '</div>';

    // 操作按钮
    h += '<button class="btn primary mt16" data-go="camera?scene=weight&side=up">拍体重秤</button>';
    h += '<button class="btn mt12" data-go="camera?scene=bp&side=up">拍血压计</button>';
    h += '<button class="btn mt12" data-go="weight?side=up">手动记一条</button>';

    // 提示条
    var tip = '';
    var st2 = S.settings();
    if (hasToday) {
      tip = '今天已经记过了，可以继续补下机数据';
    } else if (c && c.date) {
      var gap = U.daysBetween(c.date, d);
      if (gap > 7) { tip = '距离上次记录 ' + gap + ' 天了，是不是漏记了？'; }
      else { tip = '该透析了，上机前记得称体重'; }
    } else {
      tip = '先点「拍体重秤」记录第一次上机体重';
    }
    h += '<div class="tip mt16"><span class="dot"></span><span>' + tip + '</span></div>';

    h += '</div></div>';

    page.innerHTML = h;
    page.querySelector('[data-go=settings]') && (page.querySelector('[data-go=settings]').onclick = function () { go('#settings'); });
  };

  // ============================ 体重录入 ============================
  P.weight = function (page, q) {
    var side = q.side === 'down' ? 'down' : 'up';
    var date = S.getSession(q.date, q.shift) ? q.date : (q.date || U.today());
    var shift = q.shift === 'pm' ? 'pm' : 'am';
    var val = '';

    function prefill() {
      var s0 = S.getSession(date, shift);
      if (s0 && s0[side] && s0[side].weight) { return (+s0[side].weight).toFixed(1); }
      if (side === 'down' && s0 && s0.up && s0.up.weight) { return (+s0.up.weight).toFixed(1); }
      return '';
    }
    val = prefill();

    function render() {
      var h = '<div class="page">';
      h += top({
        title: '记录体重',
        back: true,
        act: '历史',
        actKey: 'hist'
      });
      h += '<div class="scroll">';
      h += '<div class="seg" id="seg">';
      h += '<div data-s="up" class="' + (side === 'up' ? 'on' : '') + '">上机前</div>';
      h += '<div data-s="down" class="' + (side === 'down' ? 'on' : '') + '">下机后</div>';
      h += '</div>';

      h += '<div class="row mt12" style="justify-content:space-between">';
      h += '<span class="lbl">最新数值</span>';
      h += '<span class="tiny muted" id="dtp">' + U.fmtDateShort(date) + ' · ' + (shift === 'am' ? '上午班' : '下午班') + ' ›</span>';
      h += '</div>';

      h += '<div class="disp mt8" id="disp">';
      h += '<span class="big" id="dv">' + (val || '0') + '</span>';
      h += '<span class="unit">kg</span>';
      h += '</div>';

      h += '<div id="tipbox" class="mt12"></div>';
      h += '<div class="kp mt12" id="kp">' + U.keypadHtml() + '</div>';
      h += '</div>';
      h += '<div class="foot"><button class="btn primary" id="save">保存体重</button></div>';
      h += '</div>';

      page.innerHTML = h;
      bind();
      refreshTip();
    }

    function refreshTip() {
      var box = page.querySelector('#tipbox');
      if (!box) { return; }
      var v = parseFloat(val);
      if (!v || side !== 'up') {
        box.innerHTML = '';
        return;
      }
      var r = S.calcUF(date, v);
      if (!r || !r.prevWeight) {
        box.innerHTML = '<div class="tip g"><span class="dot"></span><span>第一次记录上机体重</span></div>';
        return;
      }
      var uf = Math.round((v - r.prevWeight) * 10) / 10;
      var lv = U.ufLevel(uf);
      var tone = lv.tone === 'g' ? 'g' : 'o';
      var msg;
      if (uf < 0) {
        msg = '比上次下机还轻，称重是不是有误？';
      } else {
        msg = '本次预计排水 ' + uf.toFixed(1) + ' kg';
      }
      box.innerHTML = '<div class="tip ' + tone + '"><span class="dot"></span><span>上次下机 ' +
        r.prevWeight.toFixed(1) + ' kg（' + U.fmtDateShort(r.prevDate) + '）<br>' + msg + '</span></div>';
    }

    function bind() {
      var kp = page.querySelector('#kp');
      kp.onclick = function (e) {
        var b = e.target.closest('button');
        if (!b) { return; }
        val = U.applyKey(val, b.getAttribute('data-k'));
        var dv = page.querySelector('#dv');
        dv.textContent = val || '0';
        refreshTip();
      };

      var seg = page.querySelector('#seg');
      seg.onclick = function (e) {
        var t = e.target.closest('[data-s]');
        if (!t) { return; }
        side = t.getAttribute('data-s');
        val = prefill();
        render();
      };

      page.querySelector('#dtp').onclick = function () {
        var html = '<h3>选择日期与班次</h3>';
        html += '<div class="field"><span class="n">日期</span><input type="date" id="din" value="' + date + '"></div>';
        html += '<div class="seg mt12" id="sh">';
        html += '<div data-v="am" class="' + (shift === 'am' ? 'on' : '') + '">上午班</div>';
        html += '<div data-v="pm" class="' + (shift === 'pm' ? 'on' : '') + '">下午班</div>';
        html += '</div>';
        html += '<button class="btn primary mt16" id="ok">确定</button>';
        U.openSheet(html, function (sh) {
          sh.querySelector('#sh').onclick = function (e) {
            var t = e.target.closest('[data-v]');
            if (!t) { return; }
            shift = t.getAttribute('data-v');
            U.$$('#sh > div', sh).forEach(function (x) { x.className = ''; });
            t.className = 'on';
          };
          sh.querySelector('#ok').onclick = function () {
            var v = sh.querySelector('#din').value;
            if (v) { date = v; }
            U.closeSheet();
            render();
          };
        });
      };

      page.querySelector('#save').onclick = function () {
        var v = parseFloat(val);
        if (!v || v < 20 || v > 300) {
          U.toast('请先输入 20–300 之间的体重');
          return;
        }
        S.upsertSession(date, shift, side, { time: U.nowTime(), weight: Math.round(v * 10) / 10 });
        U.vibrate(20);
        U.toast('已保存 ' + v.toFixed(1) + ' kg');
        setTimeout(function () { go('#home'); }, 500);
      };

      var hist = page.querySelector('[data-act=hist]');
      if (hist) {
        hist.onclick = function () { go('#weightHist'); };
      }
    }

    render();
  };

  // ============================ 体重历史 ============================
  P.weightHist = function (page) {
    var ss = S.sessions().slice().reverse();
    var h = '<div class="page">';
    h += top({ title: '体重记录', sub: '共 ' + ss.length + ' 次透析记录', back: true });
    h += '<div class="scroll">';
    if (!ss.length) {
      h += '<div class="empty">还没有记录</div>';
    } else {
      h += '<div class="gap10" style="display:block">';
      for (var i = 0; i < ss.length; i++) {
        var s = ss[i];
        var up = s.up && s.up.weight;
        var dn = s.down && s.down.weight;
        var uf = (up && dn) ? Math.round((up - dn) * 10) / 10 : null;
        h += '<div class="lrow" data-date="' + s.date + '" data-shift="' + s.shift + '">';
        h += '<div class="main">';
        h += '<div class="t1">' + U.fmtDate(s.date) + ' ' + (s.shift === 'am' ? '上午班' : '下午班') + '</div>';
        h += '<div class="t2">';
        h += up ? ('上机 ' + up.toFixed(1)) : '上机 —';
        h += ' → ';
        h += dn ? ('下机 ' + dn.toFixed(1) + ' kg') : '下机 —';
        h += '</div></div>';
        if (uf !== null) {
          h += '<div class="t3">' + uf.toFixed(1) + '<span class="tiny muted" style="font-weight:700"> kg</span></div>';
        } else {
          h += '<div class="t3 muted" style="font-size:16px">未完成</div>';
        }
        h += '</div>';
      }
      h += '</div>';
      h += '<button class="btn ghost mt16" data-go="trend">看趋势图</button>';
    }
    h += '</div></div>';
    page.innerHTML = h;

    U.$$('.lrow', page).forEach(function (r) {
      r.onclick = function () {
        var d = r.getAttribute('data-date');
        var sp = r.getAttribute('data-shift');
        var s = S.getSession(d, sp);
        editSession(s, d, sp);
      };
    });
  };

  function editSession(s, date, shift) {
    var html = '<h3>' + U.fmtDate(date) + ' ' + (shift === 'am' ? '上午班' : '下午班') + '</h3>';
    html += '<div class="gap10" style="display:block">';
    html += '<div class="btn sm" data-go="weight?date=' + date + '&shift=' + shift + '&side=up">改上机体重</div>';
    html += '<div class="btn sm" data-go="weight?date=' + date + '&shift=' + shift + '&side=down">改下机体重</div>';
    html += '<div class="btn sm" data-go="bp?date=' + date + '&shift=' + shift + '&side=up">改上机血压</div>';
    html += '<div class="btn sm" data-go="bp?date=' + date + '&shift=' + shift + '&side=down">改下机血压</div>';
    html += '<button class="btn sm danger" id="del">删除这次记录</button>';
    html += '</div>';
    U.openSheet(html, function (sh) {
      U.$$('[data-go]', sh).forEach(function (b) {
        b.onclick = function () {
          U.closeSheet();
          go('#' + b.getAttribute('data-go'));
        };
      });
      sh.querySelector('#del').onclick = function () {
        U.confirm('删除记录', '这一天的记录会一起删掉，确定吗？', '删除', function () {
          S.removeSession(date, shift);
          U.closeSheet();
          U.toast('已删除');
          setTimeout(function () { go('#weightHist'); }, 300);
        });
      };
    });
  }

  // ============================ 趋势 ============================
  var trendDays = 90;

  P.trend = function (page) {
    var h = '<div class="page">';
    h += top({ title: '体重趋势', back: true });
    h += '<div class="scroll">';
    h += '<div class="tabs" id="tabs">';
    var opts = [[30, '1 月'], [90, '3 月'], [180, '半年'], [0, '全部']];
    for (var i = 0; i < opts.length; i++) {
      h += '<div data-d="' + opts[i][0] + '" class="' + (trendDays === opts[i][0] ? 'on' : '') + '">' + opts[i][1] + '</div>';
    }
    h += '</div>';
    h += '<div class="card mt12"><canvas class="chart" id="cv"></canvas></div>';
    h += '<div class="stat3 mt12" id="st3"></div>';
    h += '<div class="card mt12"><div class="row"><div class="h2 grow" style="margin:0">最近记录</div>';
    h += '<span class="tiny c-o b" data-go="weightHist">看全部 ›</span></div>';
    h += '<div id="recent" class="mt12"></div></div>';
    h += '</div></div>';
    page.innerHTML = h;

    page.querySelector('#tabs').onclick = function (e) {
      var t = e.target.closest('[data-d]');
      if (!t) { return; }
      trendDays = parseInt(t.getAttribute('data-d'), 10);
      render();
    };
    var gb = page.querySelector('[data-go=weightHist]');
    if (gb) { gb.onclick = function () { go('#weightHist'); }; }
    render();

    function render() {
      U.$$('#tabs > div', page).forEach(function (x) {
        x.className = parseInt(x.getAttribute('data-d'), 10) === trendDays ? 'on' : '';
      });
      var list = pick();
      draw(page.querySelector('#cv'), list);
      var box = page.querySelector('#st3');
      if (!list.length) {
        box.innerHTML = '<div class="empty">这个时间段还没有记录</div>';
      } else {
        var sum = 0, mx = -99, mn = 99;
        for (var i = 0; i < list.length; i++) {
          var u = list[i].up.weight - list[i].down.weight;
          sum += u;
          if (u > mx) { mx = u; }
          if (u < mn) { mn = u; }
        }
        var avg = sum / list.length;
        box.innerHTML = '<div><div class="k">平均排水</div><div class="v o">' + avg.toFixed(1) + '<em>kg</em></div></div>' +
          '<div><div class="k">最多</div><div class="v">' + mx.toFixed(1) + '<em>kg</em></div></div>' +
          '<div><div class="k">最少</div><div class="v">' + mn.toFixed(1) + '<em>kg</em></div></div>';
      }
      var rec = page.querySelector('#recent');
      var last2 = list.slice(-2).reverse();
      if (!last2.length) {
        rec.innerHTML = '<div class="empty" style="padding:16px 0">暂无</div>';
      } else {
        var rh = '';
        for (var j = 0; j < last2.length; j++) {
          var s = last2[j];
          var uf = Math.round((s.up.weight - s.down.weight) * 10) / 10;
          rh += '<div class="lrow" style="margin-top:' + (j ? '10px' : '0') + '">';
          rh += '<div class="main"><div class="t1">' + U.fmtDateShort(s.date) + ' ' + (s.shift === 'am' ? '上午' : '下午') + '</div>';
          rh += '<div class="t2">' + s.up.weight.toFixed(1) + ' → ' + s.down.weight.toFixed(1) + '</div></div>';
          rh += '<div class="t3">' + uf.toFixed(1) + '</div></div>';
        }
        rec.innerHTML = rh;
      }
    }

    function pick() {
      var ss = S.sessions();
      var out = [];
      var now = new Date().getTime();
      for (var i = 0; i < ss.length; i++) {
        var s = ss[i];
        if (!(s.up && s.up.weight) || !(s.down && s.down.weight)) { continue; }
        if (trendDays > 0) {
          var t = new Date(s.date.replace(/-/g, '/') + ' 00:00:00').getTime();
          if ((now - t) / 86400000 > trendDays) { continue; }
        }
        out.push(s);
      }
      return out;
    }
  };

  function draw(cv, list) {
    if (!cv) { return; }
    var dpr = g.devicePixelRatio || 1;
    var W = cv.parentNode.clientWidth - 36;
    var H = 210;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.font = '600 11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'middle';

    if (!list.length) {
      ctx.fillStyle = '#A08B70';
      ctx.textAlign = 'center';
      ctx.font = '600 14px -apple-system, sans-serif';
      ctx.fillText('暂无数据', W / 2, H / 2);
      return;
    }

    var padL = 34, padR = 14, padT = 14, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;

    var mn = 999, mx = -999;
    for (var i = 0; i < list.length; i++) {
      var a = list[i].up.weight, b = list[i].down.weight;
      if (a < mn) { mn = a; }
      if (b < mn) { mn = b; }
      if (a > mx) { mx = a; }
      if (b > mx) { mx = b; }
    }
    var rows = 4;
    var range = mx - mn;
    var raw = range < 2 ? 3 : range * 1.7;
    var cands = [0.5, 1, 2, 2.5, 5, 10, 20];
    var step = cands[cands.length - 1];
    for (var ci = 0; ci < cands.length; ci++) {
      if (cands[ci] * rows >= raw) { step = cands[ci]; break; }
    }
    var mid = (mx + mn) / 2;
    var lo = Math.round((mid - step * rows / 2) / step) * step;
    var hi = lo + step * rows;
    var dec = step < 1 ? 1 : 0;

    function X(i) {
      if (list.length === 1) { return padL + iw / 2; }
      return padL + iw * i / (list.length - 1);
    }
    function Y(v) {
      return padT + ih * (1 - (v - lo) / (hi - lo));
    }

    // 网格
    ctx.strokeStyle = '#EDE0C8';
    ctx.lineWidth = 1;
    for (var r = 0; r <= rows; r++) {
      var val = lo + step * r;
      var y = Y(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#A08B70';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(dec), padL - 6, y);
    }

    // 排水虚线
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = '#D8C4A0';
    for (i = 0; i < list.length; i++) {
      ctx.beginPath();
      ctx.moveTo(X(i), Y(list[i].up.weight));
      ctx.lineTo(X(i), Y(list[i].down.weight));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    function line(key, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var j = 0; j < list.length; j++) {
        var px = X(j), py = Y(list[j][key].weight);
        if (j === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
      for (j = 0; j < list.length; j++) {
        ctx.beginPath();
        ctx.arc(X(j), Y(list[j][key].weight), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    }
    line('up', '#E8710A');
    line('down', '#A9764B');

    // x 轴日期
    ctx.fillStyle = '#A08B70';
    ctx.textAlign = 'center';
    var stepX = Math.ceil(list.length / 6);
    for (i = 0; i < list.length; i += stepX) {
      ctx.fillText(U.fmtDateShort(list[i].date), X(i), H - 12);
    }
    if ((list.length - 1) % stepX !== 0) {
      ctx.textAlign = 'right';
      ctx.fillText(U.fmtDateShort(list[list.length - 1].date), W - 2, H - 12);
    }
  }

  // ============================ 血压录入 ============================
  P.bp = function (page, q) {
    var side = q.side === 'down' ? 'down' : 'up';
    var date = q.date || U.today();
    var shift = q.shift === 'pm' ? 'pm' : 'am';
    var cur = 'sbp';
    var v = { sbp: '', dbp: '', hr: '' };

    function render() {
      var h = '<div class="page">';
      h += top({ title: '记录血压', sub: U.fmtDate(date) + ' · ' + (shift === 'am' ? '上午班' : '下午班'), back: true, act: '历史', actKey: 'hist' });
      h += '<div class="scroll">';
      h += '<div class="seg" id="seg">';
      h += '<div data-s="up" class="' + (side === 'up' ? 'on' : '') + '">上机时</div>';
      h += '<div data-s="down" class="' + (side === 'down' ? 'on' : '') + '">下机时</div>';
      h += '</div>';

      h += '<div class="mt12" id="rows"></div>';
      h += '<div id="tipbox" class="mt10"></div>';
      h += '<div class="center mt16"><span class="linkc" data-go="camera?scene=bp&side=' + side + '">拍照自动填（拍血压计）</span></div>';
      h += '</div>';
      h += '<div class="foot"><button class="btn primary" id="save">保存血压</button></div>';
      h += '</div>';
      page.innerHTML = h;
      bind();
      paint();
    }

    function paint() {
      var fields = [
        ['sbp', '高压', 'mmHg'],
        ['dbp', '低压', 'mmHg'],
        ['hr', '心率', '次/分']
      ];
      var h = '<div class="gap10" style="display:block">';
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        h += '<div class="bprow" data-f="' + f[0] + '" style="' + (cur === f[0] ? 'border-color:#E8710A;box-shadow:0 0 0 2px #FFF1DE' : '') + '">';
        h += '<span class="n">' + f[1] + '</span>';
        h += '<span class="v">' + (v[f[0]] || '—') + '</span>';
        h += '<span class="u">' + f[2] + '</span>';
        h += '</div>';
      }
      h += '</div>';
      page.querySelector('#rows').innerHTML = h;
      U.$$('.bprow', page).forEach(function (r) {
        r.onclick = function () {
          editField(r.getAttribute('data-f'));
        };
      });
      refreshTip();
    }

    // 点某一行 → 底部弹层里用大键盘填写，一屏放得下、按键也大
    function editField(k) {
      var meta = { sbp: ['高压', 'mmHg'], dbp: ['低压', 'mmHg'], hr: ['心率', '次/分'] };
      var m = meta[k];
      var tmp = v[k] || '';
      var html = '<h3>' + m[0] + '</h3>';
      html += '<div class="disp mt10"><span class="big" id="edv">' + (tmp || '0') + '</span><span class="unit">' + m[1] + '</span></div>';
      html += '<div class="kp mt12" id="ekp">' + U.keypadHtml(true) + '</div>';
      html += '<button class="btn primary mt16" id="eok">确定</button>';
      U.openSheet(html, function (sh) {
        var val = tmp;
        var edv = sh.querySelector('#edv');
        sh.querySelector('#ekp').onclick = function (e) {
          var b = e.target.closest('button[data-k]');
          if (!b) { return; }
          var kk = b.getAttribute('data-k');
          if (kk === '⌫') {
            val = val.slice(0, -1);
          } else {
            if (val.length >= 3) { return; }
            if (val === '0') { val = kk; } else { val += kk; }
          }
          edv.textContent = val || '0';
        };
        sh.querySelector('#eok').onclick = function () {
          v[k] = val;
          cur = k;
          U.closeSheet();
          paint();
        };
      });
    }

    function refreshTip() {
      var box = page.querySelector('#tipbox');
      var sb = parseInt(v.sbp, 10), db = parseInt(v.dbp, 10);
      if (!sb || !db) {
        box.innerHTML = '<div class="center tiny muted">提示仅供参考，不替代医生判断</div>';
        return;
      }
      var lv = U.bpLevel(sb, db);
      var cls = 'tip ' + (lv.tone === 'g' ? 'g' : (lv.tone === 'r' ? 'r' : 'o'));
      var txt = sb + '/' + db + ' ' + lv.text;
      if (lv.tone !== 'g') { txt += '，若头晕心慌请告诉护士'; }
      var extra = '';
      var hr = parseInt(v.hr, 10);
      if (hr) {
        var hl = U.hrLevel(hr);
        if (hl) { extra = '<br>心率 ' + hr + ' 次/分' + hl.text; }
      }
      box.innerHTML = '<div class="' + cls + '"><span class="dot"></span><span>' + txt + extra + '</span></div>' +
        '<div class="center tiny muted mt8">提示仅供参考，不替代医生判断</div>';
    }

    function bind() {
      page.querySelector('#seg').onclick = function (e) {
        var t = e.target.closest('[data-s]');
        if (!t) { return; }
        side = t.getAttribute('data-s');
        v = { sbp: '', dbp: '', hr: '' };
        cur = 'sbp';
        render();
      };

      page.querySelector('#save').onclick = function () {
        var sb = parseInt(v.sbp, 10), db = parseInt(v.dbp, 10), hr = parseInt(v.hr, 10) || 0;
        if (!sb || !db) { U.toast('请先记住高压和低压'); return; }
        if (sb < 50 || sb > 300 || db < 30 || db > 200) { U.toast('血压数值看起来不对，请核对'); return; }
        S.upsertSession(date, shift, side, { time: U.nowTime(), sbp: sb, dbp: db, hr: hr });
        U.vibrate(20);
        U.toast('血压已保存');
        setTimeout(function () { go('#home'); }, 500);
      };

      var hist = page.querySelector('[data-act=hist]');
      if (hist) { hist.onclick = function () { go('#bpHist'); }; }

      var cam = page.querySelector('[data-go]');
      if (cam) {
        cam.onclick = function () {
          location.hash = '#' + cam.getAttribute('data-go');
        };
      }
    }

    // 已有值回填
    var old = S.getSession(date, shift);
    if (old && old[side]) {
      if (old[side].sbp) { v.sbp = String(old[side].sbp); }
      if (old[side].dbp) { v.dbp = String(old[side].dbp); }
      if (old[side].hr) { v.hr = String(old[side].hr); }
    }

    render();
  };

  // ============================ 血压历史 ============================
  // ============================ 血压记录（趋势 + 列表） ============================
  var bpMode = 'trend';

  function drawBp(cv, list) {
    if (!cv || !list.length) { return; }
    var dpr = g.devicePixelRatio || 1;
    var W = cv.parentNode.clientWidth - 36;
    var H = 220;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = '600 11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'middle';

    var padL = 36, padR = 14, padT = 14, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;

    var mn = 999, mx = -999;
    for (var i = 0; i < list.length; i++) {
      var sb = +list[i].v.sbp, db = +list[i].v.dbp;
      if (db < mn) { mn = db; }
      if (sb > mx) { mx = sb; }
    }
    var stepS = [10, 20, 25, 50][0];
    var rows = 5;
    while (stepS * rows < (mx - mn) * 1.25 && stepS < 50) {
      stepS = stepS === 10 ? 20 : (stepS === 20 ? 25 : 50);
    }
    var mid = (mx + mn) / 2;
    var lo = Math.round((mid - stepS * rows / 2) / stepS) * stepS;
    if (lo < 30) { lo = 30; }
    var hi = lo + stepS * rows;

    function X(i) {
      if (list.length === 1) { return padL + iw / 2; }
      return padL + iw * i / (list.length - 1);
    }
    function Y(v) {
      return padT + ih * (1 - (v - lo) / (hi - lo));
    }

    ctx.strokeStyle = '#EDE0C8';
    ctx.lineWidth = 1;
    for (var r = 0; r <= rows; r++) {
      var val = lo + stepS * r;
      var y = Y(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = '#A08B70';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), padL - 6, y);
    }

    function line(key, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var j = 0; j < list.length; j++) {
        var px = X(j), py = Y(+list[j].v[key]);
        if (j === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      }
      ctx.stroke();
      for (j = 0; j < list.length; j++) {
        ctx.beginPath();
        ctx.arc(X(j), Y(+list[j].v[key]), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    }
    line('sbp', '#E8710A');
    line('dbp', '#A9764B');

    ctx.fillStyle = '#A08B70';
    ctx.textAlign = 'center';
    var stepX = Math.ceil(list.length / 5);
    for (i = 0; i < list.length; i += stepX) {
      ctx.fillText(U.fmtDateShort(list[i].d), X(i), H - 12);
    }
    if ((list.length - 1) % stepX !== 0) {
      ctx.textAlign = 'right';
      ctx.fillText(U.fmtDateShort(list[list.length - 1].d), W - 2, H - 12);
    }
  }

  P.bpHist = function (page) {
    var ss = S.sessions().slice();
    var all = [];
    for (var i = 0; i < ss.length; i++) {
      var s = ss[i];
      var ord = (s.shift === 'am' ? '0' : '1');
      if (s.up && s.up.sbp) { all.push({ d: s.date, w: '上机', v: s.up, ts: s.date + ord + '0' }); }
      if (s.down && s.down.sbp) { all.push({ d: s.date, w: '下机', v: s.down, ts: s.date + ord + '1' }); }
    }
    all.sort(function (a, b) { return a.ts < b.ts ? -1 : (a.ts > b.ts ? 1 : 0); });
    var rows = all.slice().reverse();

    function render() {
      var h = '<div class="page">';
      h += top({ title: '血压记录', sub: '共 ' + all.length + ' 条', back: true });
      h += '<div class="scroll">';
      h += '<div class="tabs" id="tabs">';
      h += '<div data-m="trend" class="' + (bpMode === 'trend' ? 'on' : '') + '">趋势</div>';
      h += '<div data-m="list" class="' + (bpMode === 'list' ? 'on' : '') + '">列表</div>';
      h += '</div>';

      if (!all.length) {
        h += '<div class="empty mt20">还没有记录<br>去「血压」页记一次吧</div>';
      } else if (bpMode === 'trend') {
        h += '<div class="card mt12"><canvas class="chart" id="cv"></canvas>';
        h += '<div class="legend"><span><i style="background:#E8710A"></i>高压</span><span><i style="background:#A9764B"></i>低压</span></div></div>';

        var sumS = 0, sumD = 0, mxS = -1, mnD = 999, cnt = all.length;
        for (var k = 0; k < all.length; k++) {
          var sb = +all[k].v.sbp, db = +all[k].v.dbp;
          sumS += sb; sumD += db;
          if (sb > mxS) { mxS = sb; }
          if (db < mnD) { mnD = db; }
        }
        h += '<div class="stat3 mt12">';
        h += '<div><div class="k">平均血压</div><div class="v o">' + Math.round(sumS / cnt) + '/' + Math.round(sumD / cnt) + '</div></div>';
        h += '<div><div class="k">最高高压</div><div class="v">' + mxS + '</div></div>';
        h += '<div><div class="k">最低低压</div><div class="v">' + mnD + '</div></div>';
        h += '</div>';

        var hiCnt = 0, loCnt = 0;
        for (k = 0; k < all.length; k++) {
          var lv0 = U.bpLevel(+all[k].v.sbp, +all[k].v.dbp);
          if (lv0.tone === 'o' || lv0.tone === 'r') { hiCnt++; }
          if (lv0.tone === 'y') { loCnt++; }
        }
        h += '<div class="card mt12"><div class="h2">这段时间</div>';
        h += '<div class="row" style="justify-content:space-between"><span class="lbl">偏高 ' + hiCnt + ' 次</span>';
        h += '<span class="lbl">偏低 ' + loCnt + ' 次</span>';
        h += '<span class="lbl">正常 ' + (cnt - hiCnt - loCnt) + ' 次</span></div>';
        h += '<div class="tiny muted mt8">只按区间标颜色，不替代医生判断</div>';
        h += '</div>';
      } else {
        h += '<div class="gap10 mt12" style="display:block">';
        for (i = 0; i < rows.length; i++) {
          var r = rows[i];
          var lv = U.bpLevel(r.v.sbp, r.v.dbp);
          h += '<div class="lrow">';
          h += '<div class="main">';
          h += '<div class="t1">' + U.fmtDate(r.d) + ' ' + r.w + '</div>';
          h += '<div class="t2">' + (r.v.time || '') + (r.v.hr ? (' · 心率 ' + r.v.hr) : '') + '</div>';
          h += '</div>';
          h += '<div style="text-align:right">';
          h += '<div class="t3" style="color:var(--ink)">' + r.v.sbp + '/' + r.v.dbp + '</div>';
          h += '<span class="badge ' + lv.tone + '" style="margin-top:4px">' + lv.text + '</span>';
          h += '</div></div>';
        }
        h += '</div>';
      }
      h += '</div></div>';
      page.innerHTML = h;

      page.querySelector('#tabs').onclick = function (e) {
        var t = e.target.closest('[data-m]');
        if (!t) { return; }
        bpMode = t.getAttribute('data-m');
        render();
      };
      if (bpMode === 'trend' && all.length) {
        drawBp(page.querySelector('#cv'), all);
      }
    }

    render();
  };

  g.P1 = P;
})(window);
