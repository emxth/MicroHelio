package com.example.microhelio.models

data class ProsumerProfileResponse(
    val nic: String,
    val fullName: String,
    val email: String,
    val phone: String,
    val address: String,
    val activationStatus: String,
    val isActive: Boolean,
    val createdAt: String
)
