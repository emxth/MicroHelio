package com.example.microhelio.models

data class RegisterProsumerRequest(
    val nic: String,
    val fullName: String,
    val email: String,
    val phone: String,
    val address: String,
    val password: String
)
