/* ==========================================================
   数据层：localStorage + JSON
   表：settings / sessions（透析场次）/ records（家中散记）
       meds（药品库）/ prescriptions（月度用药与花费）
   ES5 only
   ========================================================== */
(function (g) {
  'use strict';

  var KEY = 'touxizhiyou.db.v1';
  var db = null;

  function blank() {
    return {
      schema: 1,
      settings: {
        patientName: '',
        dryWeight: 0,
        hospital: '',
        fontScale: 2
      },
      sessions: [],
      records: [],
      meds: [],
      prescriptions: []
    };
  }

  // 预置药品库（透析/肾病常见，可自行增删）
  var SEED_MEDS = [
    ['碳酸钙D3片', '钙尔奇', '600mg×60片', '片', '磷结合剂', '随餐嚼服'],
    ['醋酸钙片', '', '667mg×48片', '片', '磷结合剂', '随餐吞服'],
    ['碳酸司维拉姆片', '诺维乐', '800mg×30片', '片', '磷结合剂', '随餐吞服'],
    ['骨化三醇胶丸', '罗盖全', '0.25μg×30粒', '粒', '活性维生素D', '每日一次'],
    ['阿法骨化醇软胶囊', '', '0.25μg×30粒', '粒', '活性维生素D', '每日一次'],
    ['琥珀酸亚铁片', '速力菲', '0.1g×30片', '片', '铁剂', '饭后服用'],
    ['多糖铁复合物胶囊', '力蜚能', '150mg×30粒', '粒', '铁剂', '每日一次'],
    ['重组人促红素注射液', '益比奥', '3000IU×6支', '支', '促红素', '透析时注射'],
    ['罗沙司他胶囊', '爱瑞卓', '50mg×30粒', '粒', '促红素', '每周三次'],
    ['非布司他片', '优立通', '40mg×28片', '片', '降尿酸', '每日一次'],
    ['别嘌醇片', '', '0.1g×100片', '片', '降尿酸', '每日一次'],
    ['碳酸氢钠片', '', '0.5g×100片', '片', '纠酸', '每日三次'],
    ['复方α酮酸片', '开同', '×100片', '片', '营养', '随餐服用'],
    ['左卡尼汀注射液', '', '1g×5支', '支', '营养', '透析时注射'],
    ['硝苯地平控释片', '拜新同', '30mg×7片', '片', '降压', '每日一次'],
    ['苯磺酸氨氯地平片', '络活喜', '5mg×7片', '片', '降压', '每日一次'],
    ['缬沙坦胶囊', '代文', '80mg×7粒', '粒', '降压', '每日一次'],
    ['酒石酸美托洛尔缓释片', '倍他乐克', '47.5mg×7片', '片', '降压', '每日一次']
  ];

  function load() {
    if (db) { return db; }
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { db = JSON.parse(raw); }
    } catch (e) {
      db = null;
    }
    if (!db || typeof db !== 'object') { db = blank(); }
    var b = blank();
    for (var k in b) {
      if (db[k] === undefined || db[k] === null) { db[k] = b[k]; }
    }
    if (!db.sessions) { db.sessions = []; }
    if (!db.records) { db.records = []; }
    if (!db.prescriptions) { db.prescriptions = []; }
    if (!db.meds || !db.meds.length) { db.meds = seedMeds(); }
    return db;
  }

  function seedMeds() {
    var out = [];
    for (var i = 0; i < SEED_MEDS.length; i++) {
      var m = SEED_MEDS[i];
      out.push({
        id: 'seed_' + i,
        name: m[0], brand: m[1], spec: m[2], unit: m[3],
        category: m[4], usage: m[5], note: ''
      });
    }
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(load()));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid(p) {
    return (p || 'id') + '_' + new Date().getTime().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  }

  function sortSessions() {
    var d = load();
    d.sessions.sort(function (a, b) {
      if (a.date !== b.date) { return a.date < b.date ? -1 : 1; }
      return (a.shift || 'am') < (b.shift || 'am') ? -1 : 1;
    });
  }

  // ---------------- settings ----------------
  function settings() {
    return load().settings;
  }

  function setSettings(patch) {
    var s = load().settings;
    for (var k in patch) { s[k] = patch[k]; }
    save();
    return s;
  }

  // ---------------- sessions ----------------
  function sessions() {
    sortSessions();
    return load().sessions.slice();
  }

  function getSession(date, shift) {
    var d = load();
    var id = date + '_' + (shift || 'am');
    for (var i = 0; i < d.sessions.length; i++) {
      if (d.sessions[i].id === id) { return d.sessions[i]; }
    }
    return null;
  }

  function upsertSession(date, shift, side, patch) {
    var d = load();
    var id = date + '_' + (shift || 'am');
    var s = null;
    var i;
    for (i = 0; i < d.sessions.length; i++) {
      if (d.sessions[i].id === id) { s = d.sessions[i]; break; }
    }
    if (!s) {
      s = { id: id, date: date, shift: shift || 'am', up: {}, down: {}, note: '' };
      d.sessions.push(s);
    }
    if (!s.up) { s.up = {}; }
    if (!s.down) { s.down = {}; }

    var k;
    if (side === 'up' || side === 'down') {
      for (k in patch) { s[side][k] = patch[k]; }
    } else {
      for (k in patch) { s[k] = patch[k]; }
    }

    // 清理空场次
    if (isEmptySide(s.up) && isEmptySide(s.down) && !s.note) {
      for (i = d.sessions.length - 1; i >= 0; i--) {
        if (d.sessions[i].id === id) { d.sessions.splice(i, 1); }
      }
    }
    sortSessions();
    save();
    return s;
  }

  function isEmptySide(o) {
    if (!o) { return true; }
    for (var k in o) {
      if (o[k] !== '' && o[k] !== null && o[k] !== undefined) { return false; }
    }
    return true;
  }

  function removeSession(id) {
    var d = load();
    for (var i = d.sessions.length - 1; i >= 0; i--) {
      if (d.sessions[i].id === id) { d.sessions.splice(i, 1); }
    }
    save();
  }

  // 某日期之前（不含当天）最近一次有下机体重的记录
  function lastDownBefore(date) {
    var list = sessions();
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.date >= date) { continue; }
      if (s.down && s.down.weight) {
        if (!best || s.date > best.date) {
          best = { date: s.date, weight: +s.down.weight, session: s };
        }
      }
    }
    return best;
  }

  // 某日期之前最近一次上机血压
  function lastUpBpBefore(date) {
    var list = sessions();
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.date >= date) { continue; }
      if (s.up && s.up.sbp) {
        if (!best || s.date > best.date) {
          best = { date: s.date, sbp: +s.up.sbp, dbp: +s.up.dbp, hr: +s.up.hr || 0 };
        }
      }
    }
    return best;
  }

  // 透析量 = 本次上机体重 − 上次下机体重
  function calcUF(date, upWeight) {
    var prev = lastDownBefore(date);
    if (!prev || !upWeight) { return null; }
    return {
      uf: Math.round((+upWeight - prev.weight) * 10) / 10,
      prevDate: prev.date,
      prevWeight: prev.weight
    };
  }

  // ---------------- records ----------------
  function records() {
    var d = load();
    return d.records.slice().sort(function (a, b) {
      if (a.date !== b.date) { return a.date > b.date ? -1 : 1; }
      return (a.time || '') > (b.time || '') ? -1 : 1;
    });
  }

  function addRecord(r) {
    var d = load();
    r.id = r.id || uid('r');
    if (!r.date) { r.date = g.U.today(); }
    if (!r.time) { r.time = g.U.nowTime(); }
    d.records.push(r);
    save();
    return r;
  }

  function removeRecord(id) {
    var d = load();
    for (var i = d.records.length - 1; i >= 0; i--) {
      if (d.records[i].id === id) { d.records.splice(i, 1); }
    }
    save();
  }

  // ---------------- meds ----------------
  function meds() {
    return load().meds.slice();
  }

  function addMed(m) {
    var d = load();
    m.id = m.id || uid('m');
    d.meds.push(m);
    save();
    return m;
  }

  function updateMed(id, patch) {
    var d = load();
    for (var i = 0; i < d.meds.length; i++) {
      if (d.meds[i].id === id) {
        for (var k in patch) { d.meds[i][k] = patch[k]; }
        save();
        return d.meds[i];
      }
    }
    return null;
  }

  function removeMed(id) {
    var d = load();
    for (var i = d.meds.length - 1; i >= 0; i--) {
      if (d.meds[i].id === id) { d.meds.splice(i, 1); }
    }
    save();
  }

  // ---------------- prescriptions ----------------
  function thisMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + g.U.pad(d.getMonth() + 1);
  }

  function getPrescription(month) {
    var d = load();
    for (var i = 0; i < d.prescriptions.length; i++) {
      if (d.prescriptions[i].month === month) { return d.prescriptions[i]; }
    }
    return null;
  }

  function savePrescription(p) {
    var d = load();
    p.drugCost = +p.drugCost || 0;
    p.dialysisCost = +p.dialysisCost || 0;
    for (var i = 0; i < d.prescriptions.length; i++) {
      if (d.prescriptions[i].month === p.month) {
        d.prescriptions[i] = p;
        save();
        return p;
      }
    }
    if (!p.id) { p.id = uid('p'); }
    d.prescriptions.push(p);
    save();
    return p;
  }

  function removePrescription(month) {
    var d = load();
    for (var i = d.prescriptions.length - 1; i >= 0; i--) {
      if (d.prescriptions[i].month === month) { d.prescriptions.splice(i, 1); }
    }
    save();
  }

  function prescriptions() {
    var d = load();
    return d.prescriptions.slice().sort(function (a, b) {
      return a.month < b.month ? 1 : -1;
    });
  }

  // ---------------- 统计 ----------------
  // 取某年内的花费，key 为月份
  function costByMonth(year) {
    var list = prescriptions();
    var out = {};
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (year && p.month.substring(0, 4) !== String(year)) { continue; }
      out[p.month] = (+p.drugCost || 0) + (+p.dialysisCost || 0);
    }
    return out;
  }

  function costSplit(year) {
    var list = prescriptions();
    var drug = 0;
    var dial = 0;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (year && p.month.substring(0, 4) !== String(year)) { continue; }
      drug += (+p.drugCost || 0);
      dial += (+p.dialysisCost || 0);
    }
    return { drug: drug, dialysis: dial, total: drug + dial };
  }

  // 默认给一点示例数据，方便第一次打开不是空白
  function seedDemo() {
    var d = load();
    if (d.sessions.length || d.records.length) { return; }
    var today0 = new Date();
    var day = function (offset) {
      var t = new Date(today0.getTime() - offset * 86400000);
      return t.getFullYear() + '-' + g.U.pad(t.getMonth() + 1) + '-' + g.U.pad(t.getDate());
    };
    var demo = [
      { d: day(14), up: 101.2, down: 98.5, sbp1: 148, dbp1: 86, hr1: 74, sbp2: 132, dbp2: 78, hr2: 80 },
      { d: day(12), up: 100.2, down: 98.4, sbp1: 145, dbp1: 84, hr1: 76, sbp2: 128, dbp2: 76, hr2: 79 },
      { d: day(9), up: 99.8, down: 98.0, sbp1: 150, dbp1: 88, hr1: 78, sbp2: 130, dbp2: 77, hr2: 82 },
      { d: day(7), up: 100.0, down: 98.1, sbp1: 146, dbp1: 85, hr1: 72, sbp2: 126, dbp2: 75, hr2: 78 },
      { d: day(4), up: 99.8, down: 98.0, sbp1: 144, dbp1: 84, hr1: 75, sbp2: 125, dbp2: 74, hr2: 77 },
      { d: day(0), up: 100.0, down: 98.0, sbp1: 152, dbp1: 88, hr1: 76, sbp2: 128, dbp2: 76, hr2: 80 }
    ];
    for (var i = 0; i < demo.length; i++) {
      var x = demo[i];
      d.sessions.push({
        id: x.d + '_am', date: x.d, shift: 'am',
        up: { time: '08:10', weight: x.up, sbp: x.sbp1, dbp: x.dbp1, hr: x.hr1 },
        down: { time: '12:30', weight: x.down, sbp: x.sbp2, dbp: x.dbp2, hr: x.hr2 },
        note: ''
      });
    }
    var m = thisMonth();
    var m1 = prevMonth(m, 1);
    var m2 = prevMonth(m, 2);
    // 上月处方示例
    d.prescriptions.push({
      id: 'demo_p1', month: m1,
      items: [
        { medId: 'seed_0', name: '碳酸钙D3片', perDose: 1, timesPerDay: 3, days: 30, qty: 90 },
        { medId: 'seed_3', name: '骨化三醇胶丸', perDose: 1, timesPerDay: 1, days: 30, qty: 30 },
        { medId: 'seed_5', name: '琥珀酸亚铁片', perDose: 1, timesPerDay: 2, days: 30, qty: 60 },
        { medId: 'seed_9', name: '非布司他片', perDose: 0.5, timesPerDay: 1, days: 30, qty: 15 }
      ],
      drugCost: 412, dialysisCost: 900, note: ''
    });
    d.prescriptions.push({
      id: 'demo_p2', month: m2,
      items: [
        { medId: 'seed_0', name: '碳酸钙D3片', perDose: 1, timesPerDay: 3, days: 30, qty: 90 },
        { medId: 'seed_3', name: '骨化三醇胶丸', perDose: 1, timesPerDay: 1, days: 30, qty: 30 }
      ],
      drugCost: 368, dialysisCost: 900, note: ''
    });
    d.prescriptions.push({
      id: 'demo_p0', month: m,
      items: [
        { medId: 'seed_0', name: '碳酸钙D3片', perDose: 1, timesPerDay: 3, days: 30, qty: 90 },
        { medId: 'seed_3', name: '骨化三醇胶丸', perDose: 1, timesPerDay: 1, days: 30, qty: 30 },
        { medId: 'seed_5', name: '琥珀酸亚铁片', perDose: 1, timesPerDay: 2, days: 30, qty: 60 },
        { medId: 'seed_9', name: '非布司他片', perDose: 0.5, timesPerDay: 1, days: 30, qty: 15 }
      ],
      drugCost: 386.5, dialysisCost: 900, note: ''
    });
    d.settings.patientName = '老王';
    d.settings.dryWeight = 98;
    sortSessions();
    save();
  }

  function prevMonth(m, n) {
    var p = m.split('-');
    var y = +p[0];
    var mo = +p[1] - n;
    while (mo <= 0) { mo += 12; y -= 1; }
    return y + '-' + g.U.pad(mo);
  }

  g.DB = {
    load: load,
    save: save,
    reset: function () { localStorage.removeItem(KEY); db = null; load(); },
    uid: uid,
    settings: settings,
    setSettings: setSettings,
    sessions: sessions,
    getSession: getSession,
    upsertSession: upsertSession,
    removeSession: removeSession,
    lastDownBefore: lastDownBefore,
    lastUpBpBefore: lastUpBpBefore,
    calcUF: calcUF,
    records: records,
    addRecord: addRecord,
    removeRecord: removeRecord,
    meds: meds,
    addMed: addMed,
    updateMed: updateMed,
    removeMed: removeMed,
    thisMonth: thisMonth,
    prevMonth: prevMonth,
    getPrescription: getPrescription,
    savePrescription: savePrescription,
    removePrescription: removePrescription,
    prescriptions: prescriptions,
    costByMonth: costByMonth,
    costSplit: costSplit,
    seedDemo: seedDemo
  };

  g.Store = g.DB;
})(window);
