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
}
