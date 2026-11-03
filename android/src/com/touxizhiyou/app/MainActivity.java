package com.touxizhiyou.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.StrictMode;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;

public class MainActivity extends Activity {

    private static final int REQ_CAMERA = 101;
    private static final int REQ_PICK = 102;
    private static final int MAX_SIDE = 1500;

    private WebView web;
    private File photoFile;
    private android.widget.TextView dbg;
    private boolean pageDone = false;
    private boolean probeDone = false;
    private boolean triedData = false;
    private boolean triedSoft = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 允许 file:// 通过 Intent 传递（避免 FileUriExposedException）
        if (Build.VERSION.SDK_INT >= 24) {
            try {
                StrictMode.VmPolicy.Builder pb = new StrictMode.VmPolicy.Builder();
                StrictMode.setVmPolicy(pb.build());
            } catch (Throwable ignored) {
            }
        }

        android.widget.FrameLayout root = new android.widget.FrameLayout(this);

        web = new WebView(this);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        try {
            s.setAllowFileAccessFromFileURLs(true);
            s.setAllowUniversalAccessFromFileURLs(true);
        } catch (Throwable ignored) {
        }
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        web.setBackgroundColor(0xFFFBF4E9);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setLongClickable(false);

        root.addView(web, new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT));

        dbg = new android.widget.TextView(this);
        dbg.setTextSize(11f);
        dbg.setTextColor(0xFFC0392B);
        dbg.setBackgroundColor(0xF2FFFFFF);
        dbg.setPadding(16, 16, 16, 16);
        dbg.setText("启动中…");
        android.widget.FrameLayout.LayoutParams lp = new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = 70;
        root.addView(dbg, lp);

        setContentView(root);

        // 诊断条平时不显示，只有页面加载失败时才弹出来
        try {
            dbg.setVisibility(android.view.View.GONE);
        } catch (Throwable ignore) {
        }

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView v, String url, Bitmap fav) {
                log("START " + shortUrl(url));
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                pageDone = true;
                log("应用 DONE");
                new android.os.Handler().postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        probeJs();
                    }
                }, 1200);
            }

            @Override
            public void onReceivedError(WebView v, int code, String desc, String url) {
                log("ERR " + code + " " + desc);
                showDebug();
            }

            @Override
            public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail detail) {
                log("渲染进程已退出 crash=" + detail.didCrash());
                showDebug();
                return true;
            }
        });

        loadInline();

        new android.os.Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!pageDone) {
                    log("3 秒仍未加载完成");
                    showDebug();
                }
            }
        }, 3000);
    }

    private void showDebug() {
        try {
            dbg.setVisibility(android.view.View.VISIBLE);
        } catch (Throwable ignore) {
        }
    }

    // 页面说自己加载完了，再回头问它一句：脚本到底跑起来没有
    private void probeJs() {
        try {
            web.evaluateJavascript(
                    "(function(){try{var b=document.body;return 'U='+(typeof window.U)"
                            + "+' S='+(typeof window.Store)"
                            + "+' OCR='+(typeof window.OCR)"
                            + "+' bodyLen='+(b?b.innerHTML.length:-1)"
                            + "+' scripts='+document.scripts.length"
                            + "+' htmlLen='+document.documentElement.innerHTML.length"
                            + "+' ready='+document.readyState"
                            + "+' head='+(b?b.innerHTML.substring(0,70):'');}catch(e){return 'ERR '+e;}})()",
                    new ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String value) {
                            log("JS探测 " + value);
                            // 脚本真的跑起来了就彻底静默；没跑起来才把诊断条亮出来
                            if (value != null && value.indexOf("U=object") >= 0) {
                                try {
                                    dbg.setVisibility(android.view.View.GONE);
                                } catch (Throwable ignore) {
                                }
                            } else {
                                showDebug();
                            }
                        }
                    });
        } catch (Throwable t) {
            log("JS 探测调用异常: " + t);
        }
    }

    private String providerInfo() {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                android.content.pm.PackageInfo pi = WebView.getCurrentWebViewPackage();
                if (pi != null) {
                    return pi.packageName + " " + pi.versionName;
                }
                return "取不到";
            }
            return "SDK<26";
        } catch (Throwable t) {
            return "异常 " + t;
        }
    }

    private String probeAsset() {
        try {
            InputStream in = getAssets().open("index.html");
            int n = in.available();
            in.close();
            return "ok " + n + "B";
        } catch (Throwable t) {
            return "失败 " + t;
        }
    }

    private String shortUrl(String url) {
        if (url == null) {
            return "null";
        }
        if (url.length() > 42) {
            return url.substring(0, 42) + "…";
        }
        return url;
    }

    private String readAsset(String name) {
        try {
            InputStream in = getAssets().open(name);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                bo.write(buf, 0, n);
            }
            in.close();
            return new String(bo.toByteArray(), "UTF-8");
        } catch (Throwable t) {
            return null;
        }
    }

    // 读 assets 里由 tools/inline.js 生成的自包含单页，用 loadDataWithBaseURL 直接喂给 WebView
    private void loadInline() {
        String html = readAsset("single.html");
        if (html == null || html.length() < 1000) {
            log("单页读不到，退回 file://");
            web.loadUrl("file:///android_asset/index.html");
            return;
        }
        log("single.html " + html.length() + " 字符，loadData 加载中…");
        web.loadDataWithBaseURL("https://app.local/", html, "text/html", "UTF-8", null);

        // 兜底：换软件渲染再试一次（部分国产 ROM 的 GPU 合成会让 WebView 白屏）
        new android.os.Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!pageDone && !triedSoft) {
                    triedSoft = true;
                    log("应用页 3 秒未完成 → 软件渲染重试");
                    web.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null);
                    String h = readAsset("single.html");
                    if (h != null) {
                        web.loadDataWithBaseURL("https://app.local/", h, "text/html", "UTF-8", null);
                    }
                }
            }
        }, 3000);
    }

    private final java.util.ArrayList<String> logLines = new java.util.ArrayList<String>();

    private void log(final String line) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (dbg == null) {
                    return;
                }
                logLines.add(line);
                while (logLines.size() > 10) {
                    logLines.remove(0);
                }
                StringBuilder b = new StringBuilder();
                for (int i = 0; i < logLines.size(); i++) {
                    if (i > 0) {
                        b.append('\n');
                    }
                    b.append(logLines.get(i));
                }
                dbg.setText(b.toString());
            }
        });
    }

    // ---------- 返回键：先问页面要不要自己处理 ----------
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            web.evaluateJavascript(
                "(function(){try{return (window.__onBack&&window.__onBack())?'1':'0';}catch(e){return '0';}})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || !value.contains("1")) {
                            finish();
                        }
                    }
                });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    // ---------- JS 桥 ----------
    private class Bridge {

        @JavascriptInterface
        public void takePhoto() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startCamera();
                }
            });
        }

        @JavascriptInterface
        public void pickPhoto() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startPicker();
                }
            });
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(ms);
                }
            } catch (Throwable ignored) {
            }
        }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public String platform() {
            return "android";
        }

        @JavascriptInterface
        public void exitApp() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }
    }

    // ---------- 相机 ----------
    private void startCamera() {
        try {
            File dir = getExternalCacheDir();
            if (dir == null) {
                dir = getCacheDir();
            }
            photoFile = new File(dir, "cap_" + System.currentTimeMillis() + ".jpg");
            Uri outUri = Uri.fromFile(photoFile);

            Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            i.putExtra(MediaStore.EXTRA_OUTPUT, outUri);
            startActivityForResult(i, REQ_CAMERA);
        } catch (ActivityNotFoundException e) {
            fail("手机里没有找到相机，可以点“从相册选”或直接手动输入");
        } catch (Throwable e) {
            fail("打开相机失败：" + e.getMessage());
        }
    }

    // ---------- 相册 ----------
    private void startPicker() {
        try {
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.setType("image/*");
            i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(i, REQ_PICK);
        } catch (Throwable e) {
            fail("打开相册失败：" + e.getMessage());
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (resultCode != RESULT_OK) {
            js("window.__onPhotoCancel && window.__onPhotoCancel()");
            return;
        }

        Bitmap bm = null;
        try {
            if (requestCode == REQ_CAMERA) {
                if (photoFile == null || !photoFile.exists()) {
                    fail("没有拿到照片，请重试");
                    return;
                }
                bm = decodeFile(photoFile.getAbsolutePath(), MAX_SIDE);
                bm = applyExif(bm, photoFile.getAbsolutePath());
            } else if (requestCode == REQ_PICK) {
                if (data == null || data.getData() == null) {
                    fail("没有拿到图片");
                    return;
                }
                bm = decodeUri(data.getData(), MAX_SIDE);
            }

            if (bm == null) {
                fail("读取照片失败，换一张试试");
                return;
            }

            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            bm.compress(Bitmap.CompressFormat.JPEG, 82, bo);
            bm.recycle();

            String b64 = Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
            bo.close();

            String url = "data:image/jpeg;base64," + b64;
            String quoted = JSONObject.quote(url);
            js("window.__onPhotoData && window.__onPhotoData(" + quoted + ")");

        } catch (Throwable e) {
            fail("处理照片出错：" + e.getMessage());
        }
    }

    // ---------- 图片处理 ----------
    private Bitmap decodeFile(String path, int maxSide) {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(path, o);
        int sample = calcSample(o.outWidth, o.outHeight, maxSide);

        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = sample;
        o2.inPreferredConfig = Bitmap.Config.ARGB_8888;
        Bitmap bm = BitmapFactory.decodeFile(path, o2);
        return scaleTo(bm, maxSide);
    }

    private Bitmap decodeUri(Uri uri, int maxSide) {
        try {
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            InputStream in1 = getContentResolver().openInputStream(uri);
            BitmapFactory.decodeStream(in1, null, o);
            if (in1 != null) {
                in1.close();
            }
            int sample = calcSample(o.outWidth, o.outHeight, maxSide);

            BitmapFactory.Options o2 = new BitmapFactory.Options();
            o2.inSampleSize = sample;
            o2.inPreferredConfig = Bitmap.Config.ARGB_8888;
            InputStream in2 = getContentResolver().openInputStream(uri);
            Bitmap bm = BitmapFactory.decodeStream(in2, null, o2);
            if (in2 != null) {
                in2.close();
            }
            return scaleTo(bm, maxSide);
        } catch (Throwable t) {
            return null;
        }
    }

    private int calcSample(int w, int h, int maxSide) {
        int longest = Math.max(w, h);
        int sample = 1;
        while (longest / sample > maxSide * 2) {
            sample *= 2;
        }
        return sample;
    }

    private Bitmap scaleTo(Bitmap src, int maxSide) {
        if (src == null) {
            return null;
        }
        int w = src.getWidth();
        int h = src.getHeight();
        int longest = Math.max(w, h);
        if (longest <= maxSide) {
            return src;
        }
        float r = (float) maxSide / (float) longest;
        int nw = Math.max(1, Math.round(w * r));
        int nh = Math.max(1, Math.round(h * r));
        Bitmap out = Bitmap.createScaledBitmap(src, nw, nh, true);
        if (out != src) {
            src.recycle();
        }
        return out;
    }

    private Bitmap applyExif(Bitmap bm, String path) {
        if (bm == null) {
            return null;
        }
        try {
            ExifInterface ex = new ExifInterface(path);
            int o = ex.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            int deg = 0;
            if (o == ExifInterface.ORIENTATION_ROTATE_90) {
                deg = 90;
            } else if (o == ExifInterface.ORIENTATION_ROTATE_180) {
                deg = 180;
            } else if (o == ExifInterface.ORIENTATION_ROTATE_270) {
                deg = 270;
            }
            if (deg == 0) {
                return bm;
            }
            Matrix m = new Matrix();
            m.postRotate(deg);
            Bitmap r = Bitmap.createBitmap(bm, 0, 0, bm.getWidth(), bm.getHeight(), m, true);
            if (r != bm) {
                bm.recycle();
            }
            return r;
        } catch (Throwable t) {
            return bm;
        }
    }

    // ---------- 工具 ----------
    private void js(final String code) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    web.evaluateJavascript(code, null);
                } catch (Throwable ignored) {
                }
            }
        });
    }

    private void fail(String msg) {
        String quoted = JSONObject.quote(msg);
        js("window.__onPhotoError && window.__onPhotoError(" + quoted + ")");
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("Android");
            web.destroy();
        }
        super.onDestroy();
    }
}
