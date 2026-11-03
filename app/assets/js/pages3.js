/* ==========================================================
   页面组三：开药 / 药品库 / 花费统计 / 设置
   ES5 only
   ========================================================== */
(function (g) {
  'use strict';

  var U = g.U, S = g.Store;
  var P = g.P1;

  function go(hash) { location.hash = hash; }

  function top(o) {
    var back = o.back ? '<div class="back" data-back="1"><svg viewBox="0 0 24 24" fill="none" stroke="#2E2418" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>' : '';
    var h = '<div class="bar">' + back + '<div class="grow"><h1>' + o.title + '</h1>';
    if (o.sub) { h += '<div class="sub">' + o.sub + '</div>'; }
    h += '</div>';
    if (o.act) { h += '<div class="act" data-act="' + (o.actKey || '') + '">' + o.act + '</div>'; }
    h += '</div>';
    return h;
  }

  function medName(id) {
    var ms = S.meds();
    for (var i = 0; i < ms.length; i++) { if (ms[i].id === id) { return ms[i]; } }
    return null;
  }

  function usage(it) {
    var m = medName(it.medId);
    var unit = (m && m.unit) ? m.unit : '片';
    var dose = (it.perDose === 0.5 ? '半' + unit : it.perDose + unit);
    return dose + ' × ' + it.timesPerDay + '次/日 × ' + it.days + '天';
  }

  // ============================ 开药 ============================
  P.med = function (page, q) {
    var month = q.m || S.thisMonth();
    var tab = q.tab === 'lib' ? 'lib' : 'rx';

    function ensure() {
      var p = S.getPrescription(month);
      if (!p) {
        p = { month: month, items: [], drugCost: 0, dialysisCost: 0, note: '' };
      }
      if (!p.items) { p.items = []; }
      return p;
    }

    function save(p) {
      S.savePrescription(p);
    }

    function render() {
      var p = ensure();
      var y = month.substring(0, 4);
      var mm = parseInt(month.substring(5, 7), 10);
      var total = (+p.drugCost || 0) + (+p.dialysisCost || 0);

      var h = '<div class="page">';
      h += top({
        title: '开药 · ' + mm + '月',
        sub: y + '年' + mm + '月 · ' + p.items.length + ' 种药',
        act: '复制上月',
        actKey: 'copy'
      });
      h += '<div class="scroll">';
      h += '<div class="tabs" id="tabs">';
      h += '<div data-t="rx" class="' + (tab === 'rx' ? 'on' : '') + '">本月处方</div>';
      h += '<div data-t="lib" class="' + (tab === 'lib' ? 'on' : '') + '">药品库</div>';
      h += '</div>';

      if (tab === 'rx') {
        h += '<div class="twoc mt12">';
        h += '<div data-c="drug"><div class="k">药费</div><div class="v">' + U.money(p.drugCost) + '</div></div>';
        h += '<div data-c="dial"><div class="k">透析费</div><div class="v">' + U.money(p.dialysisCost) + '</div></div>';
        h += '</div>';

        h += '<div class="h2 mt16">本月用药 ' + p.items.length + ' 种</div>';
        if (!p.items.length) {
          h += '<div class="empty">这个月还没加药，点下面「添加药品」</div>';
        } else {
          h += '<div class="gap10" style="display:block">';
          for (var i = 0; i < p.items.length; i++) {
            var it = p.items[i];
            var m = medName(it.medId);
            h += '<div class="medrow" data-i="' + i + '">';
            h += '<div class="grow">';
            h += '<div class="nm">' + U.esc(m ? m.name : '未知药品') + '</div>';
            h += '<div class="ds">' + usage(it) + '</div>';
            h += '</div>';
            h += '<div style="color:var(--ink3);font-size:20px">›</div>';
            h += '</div>';
          }
          h += '</div>';
        }
        h += '<button class="btn ghost mt16" id="add">+ 添加药品</button>';
        h += '<button class="btn mt12" data-go="stats">看花费统计</button>';
      } else {
        var ms = S.meds();
        h += '<div class="gap10 mt12" style="display:block">';
        for (var j = 0; j < ms.length; j++) {
          var md = ms[j];
          h += '<div class="medrow" data-mid="' + md.id + '">';
          h += '<div class="grow">';
          h += '<div class="nm">' + U.esc(md.name) + '</div>';
          h += '<div class="ds">' + U.esc(md.cat || '') + (md.spec ? (' · ' + U.esc(md.spec)) : '') + '</div>';
          h += '</div>';
          h += '<div class="del" data-del="' + md.id + '">✕</div>';
          h += '</div>';
        }
        h += '</div>';
        h += '<button class="btn ghost mt16" id="newmed">+ 新增药品</button>';
      }

      h += '</div>';
      h += '<div class="pay">';
      h += '<div class="grow"><div class="t">本月总花费</div><div class="n">' + U.money(total) + '</div></div>';
      h += '<button class="btn primary" id="save" style="width:112px">保存</button>';
      h += '</div>';
      h += '</div>';

      page.innerHTML = h;
      bind(p);
    }

    function bind(p) {
      page.querySelector('#tabs').onclick = function (e) {
        var t = e.target.closest('[data-t]');
        if (!t) { return; }
        tab = t.getAttribute('data-t');
        render();
      };

      var copy = page.querySelector('[data-act=copy]');
      if (copy) {
        copy.onclick = function () {
          var prev = S.prevMonth(month, 1);
          var pp = S.getPrescription(prev);
          if (!pp || !pp.items || !pp.items.length) {
            U.toast(prev + ' 没有处方可复制');
            return;
          }
          U.confirm('复制上月', '把 ' + prev + ' 的 ' + pp.items.length + ' 种药复制到本月？', '复制', function () {
            var cur = ensure();
            cur.items = [];
            for (var i = 0; i < pp.items.length; i++) {
              cur.items.push({
                medId: pp.items[i].medId,
                perDose: pp.items[i].perDose,
                timesPerDay: pp.items[i].timesPerDay,
                days: pp.items[i].days
              });
            }
            cur.drugCost = pp.drugCost;
            cur.dialysisCost = pp.dialysisCost;
            save(cur);
            U.toast('已复制');
            render();
          });
        };
      }

      var add = page.querySelector('#add');
      if (add) {
        add.onclick = function () {
          var html = '<h3>添加药品</h3><div class="gap8" style="display:block;max-height:46vh;overflow:auto">';
          var ms = S.meds();
          for (var i = 0; i < ms.length; i++) {
            html += '<div class="lrow" data-pick="' + ms[i].id + '"><div class="main"><div class="t1">' + U.esc(ms[i].name) + '</div><div class="t2">' + U.esc(ms[i].cat || '') + '</div></div></div>';
          }
          html += '</div>';
          html += '<button class="btn ghost mt12" id="freeadd">✎ 手动输入药名</button>';
          U.openSheet(html, function (sh, close) {
            sh.onclick = function (e) {
              var t = e.target.closest('[data-pick]');
              if (!t) { return; }
              var mid = t.getAttribute('data-pick');
              close();
              editItem(-1, mid);
            };
            sh.querySelector('#freeadd').onclick = function (e) {
              e.stopPropagation();
              close();
              setTimeout(function () {
                askText('手动添加药品', '例如：碳酸钙D3片', function (name) {
                  var m = S.addMed({ name: name, cat: '', spec: '', unit: '片' });
                  setTimeout(function () { editItem(-1, m.id); }, 160);
                });
              }, 160);
            };
          });
        };
      }

      var nm0 = page.querySelector('#newmed');
      if (nm0) {
        nm0.onclick = function () {
          setTimeout(function () {
            askText('新增药品', '例如：碳酸钙D3片', function (name) {
              var m = S.addMed({ name: name, cat: '', spec: '', unit: '片' });
              setTimeout(function () { editMed(m.id); }, 160);
            });
          }, 60);
        };
      }

      U.$$('.medrow[data-i]', page).forEach(function (r) {
        r.onclick = function () {
          editItem(parseInt(r.getAttribute('data-i'), 10), null);
        };
      });

      U.$$('[data-del]', page).forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var id = b.getAttribute('data-del');
          U.confirm('删除药品', '从药品库里删掉？已开过的处方不受影响。', '删除', function () {
            S.removeMed(id);
            render();
          });
        };
      });

      U.$$('.medrow[data-mid]', page).forEach(function (r) {
        r.onclick = function (e) {
          if (e.target.closest('[data-del]')) { return; }
          editMed(r.getAttribute('data-mid'));
        };
      });

      U.$$('[data-c]', page).forEach(function (c) {
        c.onclick = function () {
          var k = c.getAttribute('data-c');
          var cur = ensure();
          editMoney(k === 'drug' ? '药费' : '透析费', cur[k === 'drug' ? 'drugCost' : 'dialysisCost'], function (v) {
            cur[k === 'drug' ? 'drugCost' : 'dialysisCost'] = v;
            save(cur);
            render();
          });
        };
      });

      page.querySelector('#save').onclick = function () {
        var cur = ensure();
        save(cur);
        U.vibrate(20);
        U.toast('本月处方已保存');
      };
    }

    function editMoney(label, val, onOk) {
      var html = '<h3>' + label + '</h3>';
      html += '<div class="disp"><span class="big" id="ev">' + (val || 0) + '</span><span class="unit">元</span></div>';
      html += '<div class="kp mt12" id="ekp">' + U.keypadHtml() + '</div>';
      html += '<button class="btn primary mt12" id="eok">确定</button>';
      U.openSheet(html, function (sh, close) {
        var cur = String(val || '');
        sh.querySelector('#ekp').onclick = function (e) {
          var b = e.target.closest('button');
          if (!b) { return; }
          cur = U.applyKey(cur, b.getAttribute('data-k'));
          sh.querySelector('#ev').textContent = cur || '0';
        };
        sh.querySelector('#eok').onclick = function () {
          var v = parseFloat(cur);
          if (isNaN(v) || v < 0) { U.toast('请输入数字'); return; }
          close();
          onOk(Math.round(v * 100) / 100);
        };
      });
    }

    function editItem(idx, newMedId) {
      var cur = ensure();
      var it = idx >= 0 ? cur.items[idx] : { medId: newMedId, perDose: 1, timesPerDay: 1, days: 30 };
      var m = medName(it.medId);
      var unit = (m && m.unit) ? m.unit : '片';

      var html = '<h3>' + U.esc(m ? m.name : '药品') + '</h3>';
      html += '<div class="tline"><span>每次</span><div class="stp" data-f="perDose"><b>-</b><i>' + it.perDose + '</i><b>+</b></div><span class="u">' + unit + '</span></div>';
      html += '<div class="tline"><span>每天</span><div class="stp" data-f="timesPerDay"><b>-</b><i>' + it.timesPerDay + '</i><b>+</b></div><span class="u">次</span></div>';
      html += '<div class="tline"><span>共</span><div class="stp" data-f="days"><b>-</b><i>' + it.days + '</i><b>+</b></div><span class="u">天</span></div>';
      html += '<button class="btn primary mt16" id="eok">确定</button>';
      if (idx >= 0) {
        html += '<button class="btn danger mt10" id="edel">从这个月删掉</button>';
      }
      U.openSheet(html, function (sh, close) {
        U.$$('.stp', sh).forEach(function (box) {
          var f = box.getAttribute('data-f');
          var btns = U.$$('b', box);
          btns[0].onclick = function () {
            if (f === 'days') { it[f] = Math.max(1, it[f] - 5); }
            else if (f === 'timesPerDay') { it[f] = Math.max(1, it[f] - 1); }
            else { it[f] = Math.max(0.5, it[f] - 0.5); }
            box.querySelector('i').textContent = it[f];
          };
          btns[1].onclick = function () {
            if (f === 'days') { it[f] = Math.min(120, it[f] + 5); }
            else if (f === 'timesPerDay') { it[f] = Math.min(6, it[f] + 1); }
            else { it[f] = Math.min(6, it[f] + 0.5); }
            box.querySelector('i').textContent = it[f];
          };
        });

        sh.querySelector('#eok').onclick = function () {
          if (idx >= 0) {
            cur.items[idx] = it;
          } else {
            cur.items.push(it);
          }
          save(cur);
          close();
          render();
        };

        var del = sh.querySelector('#edel');
        if (del) {
          del.onclick = function () {
            cur.items.splice(idx, 1);
            save(cur);
            close();
            render();
          };
        }
      });
    }

    // 只有一行文字的输入弹层：药名、备注这类自由填写
    function askText(title, ph, cb) {
      var html = '<h3>' + title + '</h3>';
      html += '<div class="field mt12"><input id="ft" placeholder="' + U.esc(ph) + '" ' +
        'style="width:100%;border:0;font-size:calc(22px * var(--k))"></div>';
      html += '<button class="btn primary mt16" id="tok">确定</button>';
      U.openSheet(html, function (sh, close) {
        var inp = sh.querySelector('#ft');
        setTimeout(function () {
          try { inp.focus(); } catch (e) { }
        }, 150);
        sh.querySelector('#tok').onclick = function () {
          var v = inp.value.trim();
          if (!v) { U.toast('请先填写'); return; }
          close();
          cb(v);
        };
      });
    }

    function editMed(id) {
      var m = id ? medName(id) : { name: '', cat: '', spec: '', unit: '片', id: '' };
      var html = '<h3>' + (id ? '修改药品' : '新增药品') + '</h3>';
      html += '<div class="field"><span class="n">药名</span><input id="fn" value="' + U.esc(m.name) + '" placeholder="如 碳酸钙D3片"></div>';
      html += '<div class="field mt10"><span class="n">分类</span><input id="fc" value="' + U.esc(m.cat || '') + '" placeholder="如 磷结合剂"></div>';
      html += '<div class="field mt10"><span class="n">规格</span><input id="fs" value="' + U.esc(m.spec || '') + '" placeholder="如 0.25μg"></div>';
      html += '<div class="field mt10"><span class="n">单位</span><input id="fu" value="' + U.esc(m.unit || '片') + '" placeholder="片 / 粒 / 支"></div>';
      html += '<button class="btn primary mt16" id="eok">保存</button>';
      U.openSheet(html, function (sh, close) {
        sh.querySelector('#eok').onclick = function () {
          var name = sh.querySelector('#fn').value.trim();
          if (!name) { U.toast('请填药名'); return; }
          var obj = {
            id: m.id || '',
            name: name,
            cat: sh.querySelector('#fc').value.trim(),
            spec: sh.querySelector('#fs').value.trim(),
            unit: sh.querySelector('#fu').value.trim() || '片'
          };
          if (m.id) { S.updateMed(m.id, obj); } else { S.addMed(obj); }
          close();
          U.toast('已保存');
          render();
        };
      });
    }

    render();
  };

  // ============================ 花费统计 ============================
  var stMode = 'year';

  P.stats = function (page) {
    function render() {
      var d = new Date();
      var year = d.getFullYear();
      var month = d.getFullYear() + '-' + U.pad(d.getMonth() + 1);

      var months = [];
      var sum = 0;
      var drug = 0, dial = 0;
      var label = '';
      var avgBase = 0;

      var all = S.prescriptions();
      var byM = {};
      for (var i = 0; i < all.length; i++) {
        byM[all[i].month] = (+all[i].drugCost || 0) + (+all[i].dialysisCost || 0);
      }

      if (stMode === 'month') {
        label = '最近 6 个月';
        var curM = year + '-' + U.pad(d.getMonth() + 1);
        for (var mb = 5; mb >= 0; mb--) {
          var kb = S.prevMonth(curM, mb);
          months.push({ k: kb, label: (+kb.substring(5)) + '月', v: byM[kb] || 0 });
        }
      } else if (stMode === 'quarter') {
        label = year + ' 年（按季度）';
        for (var q = 0; q < 4; q++) {
          var v = 0;
          for (var mm = 1; mm <= 3; mm++) {
            v += byM[year + '-' + U.pad(q * 3 + mm)] || 0;
          }
          months.push({ k: 'Q' + (q + 1), label: 'Q' + (q + 1), v: v });
        }
      } else if (stMode === 'year') {
        label = year + ' 年';
        for (var ym = 0; ym < 12; ym++) {
          var ky = year + '-' + U.pad(ym + 1);
          months.push({ k: ky, label: (ym + 1) + '月', v: byM[ky] || 0 });
        }
      } else {
        label = '全部';
        var allKeys = [];
        for (var k3 in byM) { allKeys.push(k3); }
        allKeys.sort();
        var startK = allKeys.length > 12 ? allKeys.length - 12 : 0;
        for (var ai = startK; ai < allKeys.length; ai++) {
          months.push({ k: allKeys[ai], label: allKeys[ai].substring(5) + '月', v: byM[allKeys[ai]] });
        }
      }

      sum = 0;
      for (i = 0; i < months.length; i++) { sum += months[i].v; }

      drug = 0; dial = 0;
      for (i = 0; i < all.length; i++) {
        var mk = all[i].month;
        var hit = false;
        for (var j = 0; j < months.length; j++) { if (months[j].k === mk) { hit = true; break; } }
        if (hit) {
          drug += (+all[i].drugCost || 0);
          dial += (+all[i].dialysisCost || 0);
        }
      }

      var cnt = 0;
      for (i = 0; i < months.length; i++) { if (months[i].v > 0) { cnt++; } }
      var avg = cnt ? sum / cnt : 0;

      var h = '<div class="page">';
      h += top({ title: '花费统计', back: true });
      h += '<div class="scroll">';
      h += '<div class="tabs" id="tabs">';
      var modes = [['month', '按月'], ['quarter', '按季'], ['year', '按年'], ['all', '全部']];
      for (i = 0; i < modes.length; i++) {
        h += '<div data-m="' + modes[i][0] + '" class="' + (stMode === modes[i][0] ? 'on' : '') + '">' + modes[i][1] + '</div>';
      }
      h += '</div>';

      h += '<div class="hero mt12">';
      h += '<div class="lbl">' + label + ' 总花费</div>';
      h += '<div class="big" style="margin-top:4px">' + U.moneyShort(sum) + '<span class="unit">元</span></div>';
      h += '<div class="tiny" style="color:#8A5A00;font-weight:700;margin-top:6px">已记 ' + cnt + ' 个周期 · 平均每月 ' + U.moneyShort(avg) + ' 元</div>';
      h += '</div>';

      h += '<div class="card mt12"><canvas class="chart" id="cv"></canvas></div>';

      h += '<div class="card mt12">';
      h += '<div class="h2">钱花在哪（累计）</div>';
      var tot = drug + dial || 1;
      h += barRow('透析费', dial, dial / tot, '#E8710A');
      h += barRow('药费', drug, drug / tot, '#A9764B');
      h += '</div>';

      h += '</div></div>';
      page.innerHTML = h;

      page.querySelector('#tabs').onclick = function (e) {
        var t = e.target.closest('[data-m]');
        if (!t) { return; }
        stMode = t.getAttribute('data-m');
        render();
      };

      drawBars(page.querySelector('#cv'), months);
    }

    function barRow(name, v, pct, color) {
      var p = Math.max(0, Math.min(100, Math.round(pct * 100)));
      return '<div class="mt12"><div class="row"><span class="grow b" style="font-size:20px">' + name + '</span>' +
        '<span class="b c-o" style="font-size:20px">' + U.moneyShort(v) + ' 元</span></div>' +
        '<div style="height:14px;border-radius:8px;background:#F3E9D8;margin-top:8px;overflow:hidden">' +
        '<div style="height:100%;width:' + p + '%;background:' + color + ';border-radius:8px"></div></div></div>';
    }

    function drawBars(cv, arr) {
      if (!cv) { return; }
      var dpr = g.devicePixelRatio || 1;
      var W = cv.parentNode.clientWidth - 36;
      var H = 190;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = W + 'px';
      cv.style.height = H + 'px';
      var ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (!arr.length) {
        ctx.fillStyle = '#A08B70';
        ctx.textAlign = 'center';
        ctx.font = '600 14px sans-serif';
        ctx.fillText('还没有开药记录', W / 2, H / 2);
        return;
      }

      var max = 0;
      for (var i = 0; i < arr.length; i++) { if (arr[i].v > max) { max = arr[i].v; } }
      if (max <= 0) { max = 1; }

      var padB = 26, padT = 10;
      var ih = H - padT - padB;
      var n = arr.length;
      var gap = 8;
      var bw = Math.max(8, Math.min(34, (W - gap * (n + 1)) / n));

      ctx.textAlign = 'center';
      ctx.font = '600 11px -apple-system, "PingFang SC", sans-serif';
      for (i = 0; i < n; i++) {
        var it = arr[i];
        var bh = it.v > 0 ? Math.max(4, ih * it.v / max) : 2;
        var x = gap + i * (bw + gap) + (W - gap * (n + 1) - bw * n) / 2;
        var y = padT + ih - bh;
        ctx.fillStyle = it.v > 0 ? ((i === n - 1) ? '#E8710A' : '#F6A85C') : '#EFE3CF';
        ctx.beginPath();
        var r = Math.min(7, bw / 2);
        ctx.moveTo(x, y + bh);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + bw - r, y);
        ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
        ctx.lineTo(x + bw, y + bh);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#6E5B44';
        ctx.fillText(it.label, x + bw / 2, H - 8);
      }
    }

    render();
  };

  // ============================ 设置 ============================
  P.settings = function (page) {
    function render() {
      var st = S.settings();
      var h = '<div class="page">';
      h += top({ title: '设置', back: true });
      h += '<div class="scroll">';

      h += '<div class="card">';
      h += '<div class="h2">基本信息</div>';
      h += '<div class="field mt8"><span class="n">称呼</span><input id="fname" value="' + U.esc(st.patientName || '') + '" placeholder="如 老王"></div>';
      h += '<div class="field mt10"><span class="n">干体重</span><input id="fdry" type="number" step="0.1" value="' + (st.dryWeight || '') + '" placeholder="kg"><span class="u">kg</span></div>';
      h += '</div>';

      h += '<div class="card mt12">';
      h += '<div class="h2">字体大小</div>';
      h += '<div class="tabs" id="fonts">';
      var fs = [['fs-1', '标准'], ['fs-2', '大'], ['fs-3', '特大']];
      for (var i = 0; i < fs.length; i++) {
        h += '<div data-f="' + fs[i][0] + '" class="' + ((st.fontSize || 'fs-2') === fs[i][0] ? 'on' : '') + '">' + fs[i][1] + '</div>';
      }
      h += '</div>';
      h += '<div class="tiny muted mt8">给看得清的人用「标准」，看不清楚就选「特大」。</div>';
      h += '</div>';

      h += '<div class="card mt12">';
      h += '<div class="h2">数据</div>';
      h += '<button class="btn sm" id="exp">导出备份（复制文字）</button>';
      h += '<button class="btn sm mt10" id="reset">清空全部数据</button>';
      h += '<button class="btn sm ghost mt10" id="demo">填充示例数据</button>';
      h += '</div>';

      h += '<div class="card mt12">';
      h += '<div class="h2">关于</div>';
      h += '<div class="tiny muted" style="line-height:1.7">透析之友 v1.0<br>完全离线运行，数据只存在这台手机上。<br>识别结果、血压提示仅供参考，不能替代医生和护士的判断。</div>';
      h += '</div>';

      h += '</div></div>';
      page.innerHTML = h;
      bind();
    }

    function bind() {
      var st = S.settings();

      page.querySelector('#fname').onchange = function () {
        S.setSettings({ patientName: this.value.trim() });
        U.toast('已保存');
      };
      page.querySelector('#fdry').onchange = function () {
        S.setSettings({ dryWeight: parseFloat(this.value) || 0 });
        U.toast('已保存');
      };

      page.querySelector('#fonts').onclick = function (e) {
        var t = e.target.closest('[data-f]');
        if (!t) { return; }
        var v = t.getAttribute('data-f');
        S.setSettings({ fontSize: v });
        g.applyFont && g.applyFont(v);
        render();
      };

      page.querySelector('#exp').onclick = function () {
        var raw = '';
        try {
          raw = localStorage.getItem('touxizhiyou.db.v1') || '';
        } catch (err) {}
        if (!raw) { U.toast('还没有数据'); return; }
        var html = '<h3>备份数据</h3><div class="tiny muted" style="margin-bottom:10px">长按下面文字全选复制，存到微信收藏或记事本里。</div>';
        html += '<textarea style="width:100%;height:200px;font-size:13px;border-radius:12px;border:1.5px solid #EDE0C8;padding:10px;background:#fff" readonly>' + U.esc(raw) + '</textarea>';
        U.openSheet(html);
      };

      page.querySelector('#reset').onclick = function () {
        U.confirm('清空数据', '所有体重、血压、开药记录都会删除，删了找不回来。确定吗？', '确定清空', function () {
          S.reset();
          U.toast('已清空');
          setTimeout(function () { go('#home'); }, 400);
        });
      };

      page.querySelector('#demo').onclick = function () {
        S.seedDemo();
        U.toast('已填充示例');
        setTimeout(function () { go('#home'); }, 400);
      };
    }

    render();
  };
})(window);
