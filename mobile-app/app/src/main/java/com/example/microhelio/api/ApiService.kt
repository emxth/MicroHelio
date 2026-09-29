package com.example.microhelio.api

import com.example.microhelio.models.CreateTransactionRequest
import com.example.microhelio.models.LoginRequest
import com.example.microhelio.models.LoginResponse
import com.example.microhelio.models.ProsumerProfileResponse
import com.example.microhelio.models.RegisterProsumerRequest
import com.example.microhelio.models.TransactionResponse
import com.example.microhelio.models.UpdateProsumerRequest
import com.example.microhelio.models.VerifyQrResponse
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @POST("api/auth/login")
    fun login(@Body request: LoginRequest): Call<LoginResponse>

    @POST("api/prosumers/register")
    fun registerProsumer(@Body request: RegisterProsumerRequest): Call<Void>

    @GET("api/prosumers/{nic}")
    fun getProsumerByNic(
        @Path("nic") nic: String,
        @Header("Authorization") token: String
    ): Call<ProsumerProfileResponse>

    @PUT("api/prosumers/{nic}")
    fun updateProsumer(
        @Path("nic") nic: String,
        @Header("Authorization") token: String,
        @Body request: UpdateProsumerRequest
    ): Call<ProsumerProfileResponse>

    @PATCH("api/prosumers/{nic}/deactivate")
    fun deactivateProsumer(
        @Path("nic") nic: String,
        @Header("Authorization") token: String
    ): Call<Void>

    @POST("api/Transactions/verify")
    fun verifyQrCode(
        @Header("Authorization") token: String,
        @Body qrPayload: String
    ): Call<VerifyQrResponse>

    @POST("api/Transactions")
    fun initiateTransaction(
        @Header("Authorization") token: String,
        @Body request: CreateTransactionRequest
    ): Call<TransactionResponse>

    @PATCH("api/Transactions/{id}/complete")
    fun completeTransaction(
        @Path("id") id: String,
        @Header("Authorization") token: String,
        @Body energyTransferredKWh: Double
    ): Call<VerifyQrResponse>

    @GET("api/Transactions")
    fun getTransactions(
        @Header("Authorization") token: String,
        @Query("prosumerNic") prosumerNic: String? = null,
        @Query("operatorId") operatorId: String? = null
    ): Call<List<TransactionResponse>>
}
