// 把 index.html 里的 css / js 全部内联，生成自包含的 single.html
// 用途：安卓 WebView 加载 file:///android_asset/ 时常被系统策略拦截或渲染进程卡死，
//      改成一个没有任何外部请求的单文件，再用 loadDataWithBaseURL 塞进去，可绕开该问题。
// 用法：node tools/inline.js <assets 目录>
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) {
  console.error('用法: node tools/inline.js <assets 目录>');
  process.exit(1);
}

const src = path.join(root, 'index.html');
let html = fs.readFileSync(src, 'utf8');
let cssCount = 0;
let jsCount = 0;

html = html.replace(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/gi, function (m, href) {
  const file = path.join(root, href);
  const css = fs.readFileSync(file, 'utf8');
  cssCount++;
  return '<style>\n/* ===== ' + href + ' ===== */\n' + css + '\n</style>';
});

html = html.replace(/<script\b[^>]*src="([^"]+\.js)"[^>]*><\/script>/gi, function (m, js) {
  const file = path.join(root, js);
  const code = fs.readFileSync(file, 'utf8');
  jsCount++;
  // 防止脚本内容里出现 </script> 提前闭合标签
  const safe = code.replace(/<\/script>/gi, '<\\/script>');
  return '<script>\n/* ===== ' + js + ' ===== */\n' + safe + '\n</script>';
});

const out = path.join(root, 'single.html');
fs.writeFileSync(out, html, 'utf8');
console.log('inline: css=' + cssCount + ' js=' + jsCount + ' -> ' + out + ' (' + Buffer.byteLength(html, 'utf8') + ' 字节)');
