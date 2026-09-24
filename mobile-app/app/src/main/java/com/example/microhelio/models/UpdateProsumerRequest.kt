package com.example.microhelio.models

data class UpdateProsumerRequest(
    val fullName: String?,
    val email: String?,
    val phone: String?,
    val address: String?,
    val password: String? = null
)
