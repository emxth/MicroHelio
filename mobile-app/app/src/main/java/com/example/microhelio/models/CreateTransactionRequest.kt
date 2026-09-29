package com.example.microhelio.models

data class CreateTransactionRequest(
    val reservationId: String,
    val prosumerNic: String,
    val nodeId: String,
    val scannedQrCode: String
)