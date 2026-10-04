package com.example.microhelio.api

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
}

