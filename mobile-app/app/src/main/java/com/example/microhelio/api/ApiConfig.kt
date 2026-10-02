package com.example.microhelio.api

object ApiConfig {
    // Android Studio Emulator
//    const val HOST_IP = "10.0.2.2"

    // Physical phone over USB after: adb reverse tcp:5056 tcp:5056
     const val HOST_IP = "localhost"

    // Physical phone over the same hotspot/Wi-Fi LAN
    // const val HOST_IP = "192.168.43.128"

    // Port on which the .NET Web API is running
    const val PORT = 5056

    /**
     * Retrofit requires a trailing slash in its base URL.
     */
    fun getBaseUrl(): String {
        return "http://$HOST_IP:$PORT/"
    }

    fun getApiBaseUrl(): String {
        return getBaseUrl() + "api"
    }
}
