package com.example.microhelio.api

import android.os.Build
import com.example.microhelio.BuildConfig

object ApiConfig {
    /**
     * IP host configured via local.properties (api.host=192.168.1.116 or 10.0.2.2 or localhost)
     */
    val HOST_IP: String = BuildConfig.API_HOST_IP

    /**
     * Port on which the .NET Web API is running
     */
    val PORT: Int = BuildConfig.API_PORT

    /**
     * Retrofit requires a trailing slash in its base URL.
     */
    fun getBaseUrl(): String {
        return "http://$HOST_IP:$PORT/"
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

