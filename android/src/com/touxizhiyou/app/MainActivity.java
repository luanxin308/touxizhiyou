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
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setLongClickable(false);

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
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
