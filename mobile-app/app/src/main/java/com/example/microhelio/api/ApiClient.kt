package com.example.microhelio.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {
    private const val BASE_URL = "http://10.0.2.2:5056/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        // Keep logging only for development/testing and avoid exposing sensitive values in final production logging.
        // For now,BODY is useful to see the login request/response in logcat during testing.
        level = HttpLoggingInterceptor.Level.BODY 
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
