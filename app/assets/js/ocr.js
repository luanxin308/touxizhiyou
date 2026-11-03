/* ==========================================================
   数码管识别引擎（纯 JS，离线，无第三方库）
   思路：灰度 → Otsu 二值化 → 判断前景极性 → 水平膨胀把同一
        数字的 7 段粘连 → 行投影找数字行带 → 列投影切字符
        → 每字符按 7 段位置采样 → 查表得数字
   适用：体重秤 / 血压计 / 电视屏上的段码数字
   ES5 only
   ========================================================== */
(function (g) {
  'use strict';

  var SEG_TABLE = {
    63: '0', 6: '1', 91: '2', 79: '3', 102: '4',
    109: '5', 125: '6', 7: '7', 127: '8', 111: '9'
  };

  // ---------- 基础图像处理 ----------
  function toGray(data) {
    var d = data.data;
    var n = data.width * data.height;
    var g = new Uint8Array(n);
    for (var i = 0, j = 0; i < n; i++, j += 4) {
      g[i] = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000;
    }
    return g;
  }

  function otsu(gray) {
    var hist = new Array(256);
    var i;
    for (i = 0; i < 256; i++) { hist[i] = 0; }
    for (i = 0; i < gray.length; i++) { hist[gray[i]]++; }
    var total = gray.length;
    var sum = 0;
    for (i = 0; i < 256; i++) { sum += i * hist[i]; }
    var sumB = 0, wB = 0, max = -1, th = 127;
    for (i = 0; i < 256; i++) {
      wB += hist[i];
      if (!wB) { continue; }
      var wF = total - wB;
      if (!wF) { break; }
      sumB += i * hist[i];
      var mB = sumB / wB;
      var mF = (sum - sumB) / wF;
      var between = wB * wF * (mB - mF) * (mB - mF);
      if (between > max) { max = between; th = i; }
    }
    return th;
  }

  function binarize(gray, W, H) {
    var th = otsu(gray);
    var n = W * H;
    var bright = new Uint8Array(n);
    var cnt = 0;
    var i;
    for (i = 0; i < n; i++) {
      if (gray[i] > th) { bright[i] = 1; cnt++; }
    }
    var ratio = cnt / n;
    // 亮像素少 → 亮是字（暗底亮字，常见数码管）
    // 亮像素多 → 暗是字（亮底暗字，如电视、LCD 白底）
    var fg = new Uint8Array(n);
    var invert = ratio >= 0.5;
    for (i = 0; i < n; i++) {
      fg[i] = invert ? (1 - bright[i]) : bright[i];
    }
    return { bin: fg, th: th, invert: invert };
  }

  // 水平膨胀：把同一数字内部的段缝连起来
  function dilateH(bin, W, H, k) {
    var out = new Uint8Array(W * H);
    for (var y = 0; y < H; y++) {
      var row = y * W;
      var last = -9999;
      for (var x = 0; x < W; x++) {
        if (bin[row + x]) { last = x; }
        if (x - last <= k) { out[row + x] = 1; }
      }
    }
    return out;
  }

  // 垂直膨胀（把上下断开的段连起来，用于行聚类）
  function dilateV(bin, W, H, k) {
    var out = new Uint8Array(W * H);
    for (var x = 0; x < W; x++) {
      var last = -9999;
      for (var y = 0; y < H; y++) {
        if (bin[y * W + x]) { last = y; }
        if (y - last <= k) { out[y * W + x] = 1; }
      }
    }
    return out;
  }

  function rowProfile(bin, W, H) {
    var p = new Uint32Array(H);
    for (var y = 0; y < H; y++) {
      var c = 0;
      var row = y * W;
      for (var x = 0; x < W; x++) {
        if (bin[row + x]) { c++; }
      }
      p[y] = c;
    }
    return p;
  }

  function colProfile(bin, W, H, y0, y1) {
    var p = new Uint32Array(W);
    for (var x = 0; x < W; x++) {
      var c = 0;
      for (var y = y0; y <= y1; y++) {
        if (bin[y * W + x]) { c++; }
      }
      p[x] = c;
    }
    return p;
  }

  // 找投影中的连续非零段（带最小长度过滤）
  function bands(profile, minLen, threshold) {
    var out = [];
    var start = -1;
    var i;
    for (i = 0; i < profile.length; i++) {
      if (profile[i] > threshold) {
        if (start < 0) { start = i; }
      } else {
        if (start >= 0) {
          if (i - start >= minLen) { out.push([start, i - 1]); }
          start = -1;
        }
      }
    }
    if (start >= 0 && profile.length - start >= minLen) {
      out.push([start, profile.length - 1]);
    }
    return out;
  }

  function density(bin, W, x0, y0, x1, y1) {
    if (x1 < x0 || y1 < y0) { return 0; }
    var cnt = 0, tot = 0;
    for (var y = y0; y <= y1; y++) {
      var row = y * W;
      for (var x = x0; x <= x1; x++) {
        tot++;
        if (bin[row + x]) { cnt++; }
      }
    }
    return tot ? cnt / tot : 0;
  }

  // 收紧到前景的紧致边界
  function tighten(bin, W, x0, y0, x1, y1) {
    var minX = x1, maxX = x0, minY = y1, maxY = y0, any = false;
    for (var y = y0; y <= y1; y++) {
      var row = y * W;
      for (var x = x0; x <= x1; x++) {
        if (bin[row + x]) {
          any = true;
          if (x < minX) { minX = x; }
          if (x > maxX) { maxX = x; }
          if (y < minY) { minY = y; }
          if (y > maxY) { maxY = y; }
        }
      }
    }
    if (!any) { return null; }
    return { x0: minX, y0: minY, x1: maxX, y1: maxY };
  }

  // ---------- 七段判定 ----------
  function segRects(box) {
    var x0 = box.x0, y0 = box.y0;
    var bw = box.x1 - box.x0;
    var bh = box.y1 - box.y0;
    function r(a, b, c, d) {
      return [
        x0 + Math.round(bw * a),
        y0 + Math.round(bh * b),
        x0 + Math.round(bw * c),
        y0 + Math.round(bh * d)
      ];
    }
    return {
      a: r(0.22, 0.00, 0.78, 0.14),
      f: r(0.00, 0.10, 0.22, 0.45),
      b: r(0.78, 0.10, 1.00, 0.45),
      gg: r(0.22, 0.43, 0.78, 0.57),
      e: r(0.00, 0.55, 0.22, 0.90),
      c: r(0.78, 0.55, 1.00, 0.90),
      d: r(0.22, 0.86, 0.78, 1.00)
    };
  }

  var SEG_TH = 0.30;

  function readSegMask(bin, W, box) {
    var R = segRects(box);
    var d;
    var m = 0;
    var conf = 0;
    var bits = [
      ['a', 1], ['b', 2], ['c', 4], ['d', 8], ['e', 16], ['f', 32], ['gg', 64]
    ];
    for (var i = 0; i < bits.length; i++) {
      var key = bits[i][0];
      var rect = R[key];
      d = density(bin, W, rect[0], rect[1], rect[2], rect[3]);
      if (d >= SEG_TH) {
        m |= bits[i][1];
        conf += Math.min(1, d / (SEG_TH * 2));
      } else {
        conf += Math.min(1, (SEG_TH - d) / SEG_TH);
      }
    }
    return { mask: m, conf: conf / 7 };
  }

  // 掩码 → 数字（允许 1 位误差）
  function maskToDigit(mask) {
    if (SEG_TABLE[mask] !== undefined) {
      return { ch: SEG_TABLE[mask], err: 0 };
    }
    var best = null;
    var bestErr = 99;
    for (var k in SEG_TABLE) {
      var m = +k;
      var x = m ^ mask;
      var err = 0;
      while (x) { err += x & 1; x >>= 1; }
      if (err < bestErr) {
        bestErr = err;
        best = SEG_TABLE[k];
      }
    }
    if (bestErr <= 1) { return { ch: best, err: bestErr }; }
    return { ch: '?', err: bestErr };
  }

  // ---------- 主流程 ----------
  function analyze(imageData) {
    var W = imageData.width;
    var H = imageData.height;
    var gray = toGray(imageData);
    var bz = binarize(gray, W, H);
    var bin = bz.bin;

    // 轻微水平膨胀（缝宽经验值：图宽的 0.4%，最少 2px）
    var k = Math.max(2, Math.round(W * 0.004));
    var dil = dilateH(bin, W, H, k);

    // 行投影找数字行带
    var rp = rowProfile(dil, W, H);
    var maxRow = 0;
    var i;
    for (i = 0; i < H; i++) { if (rp[i] > maxRow) { maxRow = rp[i]; } }
    if (!maxRow) {
      return { ok: false, reason: 'empty', text: '', lines: [] };
    }

    var rowTh = Math.max(2, Math.floor(maxRow * 0.25));
    var rowBands = bands(rp, Math.max(6, Math.round(H * 0.02)), rowTh);

    // 取最高的几行（最多 3 行，血压计可能显示 3 组）
    rowBands.sort(function (p, q) { return (q[1] - q[0]) - (p[1] - p[0]); });
    if (rowBands.length > 3) { rowBands = rowBands.slice(0, 3); }
    rowBands.sort(function (p, q) { return p[0] - q[0]; });

    var lines = [];
    for (var bi = 0; bi < rowBands.length; bi++) {
      var y0 = rowBands[bi][0];
      var y1 = rowBands[bi][1];
      var bandH = y1 - y0;
      if (bandH < H * 0.03) { continue; }

      var cp = colProfile(bin, W, H, y0, y1);
      var colBands = bands(cp, Math.max(3, Math.round(W * 0.004)), Math.max(1, Math.floor(bandH * 0.12)));

      var chars = [];
      var lastY = -1;
      for (var ci = 0; ci < colBands.length; ci++) {
        var cx0 = colBands[ci][0];
        var cx1 = colBands[ci][1];
        var bw = cx1 - cx0 + 1;
        if (bw < 3) { continue; }

        var tb = tighten(bin, W, cx0, y0, cx1, y1);
        if (!tb) { continue; }
        var th = tb.y1 - tb.y0 + 1;
        var tw = tb.x1 - tb.x0 + 1;
        if (th < bandH * 0.35) { continue; }

        // 小数点：矮个子、宽高比很小、靠近底部
        var ratio = tw / th;
        if (ratio < 0.30 && th < bandH * 0.35 + 2) {
          chars.push({ ch: '.', conf: 0.9, dot: true, box: tb });
          continue;
        }
        if (ratio < 0.34) {
          chars.push({ ch: '.', conf: 0.85, dot: true, box: tb });
          continue;
        }
        if (ratio > 1.4) { continue; } // 太扁，不是数字

        var r = readSegMask(bin, W, tb);
        var d = maskToDigit(r.mask);
        chars.push({ ch: d.ch, conf: r.conf, err: d.err, mask: r.mask, box: tb });
        lastY = tb.y1;
      }

      var text = '';
      var total = 0;
      var good = 0;
      for (var j = 0; j < chars.length; j++) {
        text += chars[j].ch;
        total++;
        if (chars[j].ch !== '?') { good++; }
      }
      if (total > 0) {
        lines.push({
          text: text,
          chars: chars,
          y0: y0, y1: y1,
          conf: total ? good / total : 0
        });
      }
    }

    // 按行宽（字符数）排序，最上面的一行优先
    var bestText = '';
    var bestConf = 0;
    for (var li = 0; li < lines.length; li++) {
      if (lines[li].text.replace(/[^0-9.]/g, '').length > bestText.replace(/[^0-9.]/g, '').length) {
        bestText = lines[li].text;
        bestConf = lines[li].conf;
      }
    }

    return {
      ok: lines.length > 0,
      text: bestText,
      conf: bestConf,
      lines: lines,
      th: bz.th,
      invert: bz.invert,
      size: { w: W, h: H }
    };
  }

  // 从 img 元素识别
  function recognize(img, maxSide) {
    maxSide = maxSide || 720;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (!w || !h) { return { ok: false, reason: 'noimage', text: '', lines: [] }; }

    var scale = Math.min(1, maxSide / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));

    var cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    var ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);

    var data;
    try {
      data = ctx.getImageData(0, 0, cw, ch);
    } catch (e) {
      return { ok: false, reason: 'cors', text: '', lines: [] };
    }
    return analyze(data);
  }

  // 把二值结果画出来，便于调试
  function debugCanvas(img, maxSide) {
    maxSide = maxSide || 720;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, maxSide / Math.max(w, h));
    var cw = Math.round(w * scale);
    var ch = Math.round(h * scale);

    var cv = document.createElement('canvas');
    cv.width = cw;
    cv.height = ch;
    var ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cw, ch);
    var data = ctx.getImageData(0, 0, cw, ch);
    var gray = toGray(data);
    var bz = binarize(gray, cw, ch);
    var out = ctx.createImageData(cw, ch);
    for (var i = 0; i < cw * ch; i++) {
      var v = bz.bin[i] ? 255 : 0;
      out.data[i * 4] = v;
      out.data[i * 4 + 1] = v;
      out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    return cv;
  }

  g.OCR = {
    recognize: recognize,
    analyze: analyze,
    debugCanvas: debugCanvas,
    maskToDigit: maskToDigit
  };
})(window);
