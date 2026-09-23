package com.example.microhelio.api

import com.example.microhelio.models.LoginRequest
import com.example.microhelio.models.LoginResponse
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("api/auth/login")
    fun login(@Body request: LoginRequest): Call<LoginResponse>

    @POST("api/prosumers/register")
    fun registerProsumer(@Body request: com.example.microhelio.models.RegisterProsumerRequest): Call<Void>

    @retrofit2.http.GET("api/prosumers/{nic}")
    fun getProsumerByNic(
        @retrofit2.http.Path("nic") nic: String,
        @retrofit2.http.Header("Authorization") token: String
    ): Call<com.example.microhelio.models.ProsumerProfileResponse>

    @retrofit2.http.PUT("api/prosumers/{nic}")
    fun updateProsumer(
        @retrofit2.http.Path("nic") nic: String,
        @retrofit2.http.Header("Authorization") token: String,
        @Body request: com.example.microhelio.models.UpdateProsumerRequest
    ): Call<com.example.microhelio.models.ProsumerProfileResponse>
    @retrofit2.http.PATCH("api/prosumers/{nic}/deactivate")
    fun deactivateProsumer(
        @retrofit2.http.Path("nic") nic: String,
        @retrofit2.http.Header("Authorization") token: String
    ): Call<Void>
}
