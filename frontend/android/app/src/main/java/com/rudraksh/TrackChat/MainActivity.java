package com.rudraksh.TrackChat;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            // Let Android natively fit system bars and adjustResize for the keyboard
            WindowCompat.setDecorFitsSystemWindows(window, true);
            window.setStatusBarColor(Color.parseColor("#F8FAFF"));
            window.setNavigationBarColor(Color.parseColor("#FFFFFF"));

            View decorView = window.getDecorView();
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }
        }

        // Fallback for any unconsumed system bar insets; NEVER pad for IME keyboard
        // because adjustResize + WebView already resizes above the keyboard.
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets systemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                boolean imeVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());

                int bottomPadding = imeVisible ? 0 : systemBars.bottom;
                v.setPadding(systemBars.left, systemBars.top, systemBars.right, bottomPadding);

                return windowInsets;
            });
            ViewCompat.requestApplyInsets(contentView);
        }

        // Handle Android Back navigation button: go back from 1-to-1 chat / sub-screens to Chats dashboard
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.evaluateJavascript(
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
}
