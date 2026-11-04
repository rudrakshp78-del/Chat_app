# ==========================================
# Capacitor Core & Plugin ProGuard / R8 Rules
# ==========================================

# Keep Capacitor annotations from being stripped or optimized away
-keep @interface com.getcapacitor.** { *; }

# Keep Capacitor plugin classes, methods, and callback hooks safe from obfuscation
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

-keep public class * extends com.getcapacitor.Plugin { *; }

# Prevent R8 full mode from optimizing interface/annotations into null via reflection checks
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }

# Ensure reflection-based lookup on non-public base classes doesn't fail
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}

# Preserve WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep our MainActivity
-keep class com.rudraksh.TrackChat.MainActivity { *; }

# Preserve line numbers and source file for Play Console de-obfuscation & crash stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Suppress common non-fatal warnings
-dontwarn com.google.android.gms.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.apache.cordova.**
