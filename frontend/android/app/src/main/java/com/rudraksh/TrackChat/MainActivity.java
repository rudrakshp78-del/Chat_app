package com.rudraksh.TrackChat;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String CHANNEL_ID = "trackon_chat_channel";
    private static final String CHANNEL_NAME = "Trackon Messages & Alerts";

    private int currentSafeTop = 0;
    private int currentSafeBottom = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Pre-create the notification channel for Android 8.0+ (Oreo and higher)
        createNotificationChannel();

        Window window = getWindow();
        if (window != null) {
            // Enable edge-to-edge so webview backgrounds seamlessly reach all screen edges
            WindowCompat.setDecorFitsSystemWindows(window, false);
            window.setStatusBarColor(Color.parseColor("#F8FAFF"));
            window.setNavigationBarColor(Color.parseColor("#FFFFFF"));

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
                window.setStatusBarContrastEnforced(false);
            }

            View decorView = window.getDecorView();
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
                // Ensure navigation bar is visible and does not conflict with gesture nav
                controller.show(WindowInsetsCompat.Type.navigationBars());
            }
        }

        // Measure exact system bars (status bar, camera notch cutout, navigation buttons / gestures)
        // and inject them into the webview as CSS custom properties (--safe-top, --safe-bottom).
        // This ensures the top and bottom nav bars sit in the exact safe areas like WhatsApp with zero overlap.
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.parseColor("#F8FAFF"));
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets imeInsets = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                boolean imeVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime()) || imeInsets.bottom > 0;

                float density = getResources().getDisplayMetrics().density;
                int topDp = Math.round(systemBars.top / density);
                int bottomDp = imeVisible ? 0 : Math.round(systemBars.bottom / density);

                currentSafeTop = topDp;
                currentSafeBottom = bottomDp;

                applySafeAreaToWeb(topDp, bottomDp);

                v.setPadding(0, 0, 0, 0);
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(contentView);
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            // 1. Expose a theme bridge so system bars update color dynamically when light/dark theme toggles in webview
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void setSystemBars(String statusHex, String navHex, boolean lightIcons) {
                    runOnUiThread(() -> {
                        Window win = getWindow();
                        if (win != null) {
                            try {
                                win.setStatusBarColor(Color.parseColor(statusHex));
                                win.setNavigationBarColor(Color.parseColor(navHex));
                                View decor = win.getDecorView();
                                WindowInsetsControllerCompat c = WindowCompat.getInsetsController(win, decor);
                                if (c != null) {
                                    c.setAppearanceLightStatusBars(lightIcons);
                                    c.setAppearanceLightNavigationBars(lightIcons);
                                }
                                View content = findViewById(android.R.id.content);
                                if (content != null) {
                                    content.setBackgroundColor(Color.parseColor(statusHex));
                                }
                            } catch (Exception ignored) {}
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public int getSafeTop() {
                    return currentSafeTop;
                }

                @android.webkit.JavascriptInterface
                public int getSafeBottom() {
                    return currentSafeBottom;
                }
            }, "AndroidThemeBridge");

            // 2. Expose a native notification bridge for notification bar alerts with sound
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void requestPermission() {
                    runOnUiThread(() -> checkAndRequestNotificationPermission());
                }

                @android.webkit.JavascriptInterface
                public boolean hasPermission() {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
                    }
                    return NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled();
                }

                @android.webkit.JavascriptInterface
                public void showNotification(String title, String body, String conversationId) {
                    runOnUiThread(() -> postSystemNotification(title, body, conversationId));
                }
            }, "AndroidNotificationBridge");
        }

        // Handle Android Back navigation button: go back from 1-to-1 chat / sub-screens to Chats dashboard
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv != null) {
                    wv.evaluateJavascript(
                        "(function() { return typeof window.__handleAndroidBack === 'function' ? window.__handleAndroidBack() : 'EXIT'; })()",
                        value -> {
                            if (value == null || value.contains("EXIT")) {
                                moveTaskToBack(true);
                            }
                        }
                    );
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.hasExtra("conversation_id")) {
            String convId = intent.getStringExtra("conversation_id");
            if (convId != null && !convId.isEmpty()) {
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv != null) {
                    wv.post(() -> {
                        wv.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('open_notification_chat', { detail: { conversation_id: '" + convId + "' } }));",
                            null
                        );
                    });
                }
            }
        }
    }

    /**
     * Create high-importance notification channel with sound, vibration, and lights for notification bar.
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                        CHANNEL_ID,
                        CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Incoming chat messages, calls, and friendship alerts");
                    channel.enableLights(true);
                    channel.setLightColor(Color.parseColor("#00A884"));
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 200, 100, 250});

                    // Set standard notification ringtone/sound
                    Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                    channel.setSound(soundUri, audioAttributes);

                    manager.createNotificationChannel(channel);
                }
            }
        }
    }

    /**
     * Post a native notification directly to the Android notification bar with sound and vibration.
     */
    public void postSystemNotification(String title, String body, String conversationId) {
        try {
            createNotificationChannel();

            Intent intent = new Intent(this, MainActivity.class);
            intent.setAction(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (conversationId != null && !conversationId.isEmpty()) {
                intent.putExtra("conversation_id", conversationId);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            int notifId = (int) (System.currentTimeMillis() % 100000);
            PendingIntent pendingIntent = PendingIntent.getActivity(this, notifId, intent, flags);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            int appIcon = getApplicationInfo().icon != 0 ? getApplicationInfo().icon : android.R.drawable.stat_notify_chat;

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(appIcon)
                .setContentTitle(title != null && !title.isEmpty() ? title : "Trackon")
                .setContentText(body != null && !body.isEmpty() ? body : "New message received")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 200, 100, 250})
                .setColor(Color.parseColor("#00A884"));

            NotificationManagerCompat.from(this).notify(notifId, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Request POST_NOTIFICATIONS on Android 13+ (API 33+)
     */
    public void checkAndRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
            }
        }
    }

    private void applySafeAreaToWeb(int topDp, int bottomDp) {
        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv != null) {
            wv.post(() -> {
                String js = String.format(
                    java.util.Locale.US,
                    "(function() {" +
                    "  document.documentElement.style.setProperty('--safe-top', '%dpx');" +
                    "  document.documentElement.style.setProperty('--safe-bottom', '%dpx');" +
                    "  window.__safeAreaTop = %d;" +
                    "  window.__safeAreaBottom = %d;" +
                    "  window.dispatchEvent(new CustomEvent('safe_area_changed', { detail: { top: %d, bottom: %d } }));" +
                    "})();",
                    topDp, bottomDp, topDp, bottomDp, topDp, bottomDp
                );
                wv.evaluateJavascript(js, null);
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.requestApplyInsets(contentView);
        }
        if (currentSafeTop > 0 || currentSafeBottom > 0) {
            applySafeAreaToWeb(currentSafeTop, currentSafeBottom);
        }
    }
}