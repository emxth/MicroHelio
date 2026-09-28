package com.example.microhelio.api

import android.os.Build

object ApiConfig {
    // Port on which the .NET Web API is running
    const val PORT = 5056

    /**
     * Primary Base URL for API endpoints.
     * When using USB debugging on a physical device, 'adb reverse tcp:5056 tcp:5056'
     * routes 'http://127.0.0.1:5056/' directly over the USB cable to your PC.
     * For Android Studio Emulator, '10.0.2.2' is used.
     */
    fun getBaseUrl(): String {
        return if (isEmulator()) {
            "http://10.0.2.2:$PORT/"
        } else {
            "http://127.0.0.1:$PORT/"
        }
    }

    fun getApiBaseUrl(): String {
        return getBaseUrl() + "api"
    }

    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk" == Build.PRODUCT)
    }
}
