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
        val fingerprint = Build.FINGERPRINT.lowercase()
        val model = Build.MODEL.lowercase()
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val device = Build.DEVICE.lowercase()
        val product = Build.PRODUCT.lowercase()
        val hardware = Build.HARDWARE.lowercase()

        return (fingerprint.startsWith("generic")
                || fingerprint.startsWith("unknown")
                || fingerprint.contains("sdk_gphone")
                || fingerprint.contains("vbox")
                || model.contains("google_sdk")
                || model.contains("emulator")
                || model.contains("android sdk built for x86")
                || model.contains("sdk_gphone")
                || manufacturer.contains("genymotion")
                || hardware.contains("goldfish")
                || hardware.contains("ranchu")
                || product.contains("sdk")
                || product.contains("google_sdk")
                || product.contains("vbox86p")
                || (brand.startsWith("generic") && device.startsWith("generic")))
    }
}
