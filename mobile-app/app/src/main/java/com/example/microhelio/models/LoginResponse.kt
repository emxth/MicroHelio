package com.example.microhelio.models

import com.google.gson.annotations.SerializedName

data class LoginResponse(
    @SerializedName("token") val token: String,
    @SerializedName("expiresAtUtc") val expiresAtUtc: String,
    @SerializedName("accountId") val accountId: String,
    @SerializedName("accountIdentifier") val accountIdentifier: String,
    @SerializedName("role") val role: String,
    @SerializedName("fullName") val fullName: String
)
