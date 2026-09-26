package com.example.microhelio.models

data class TransactionResponse(
    val id: String? = null,
    val transactionCode: String? = null,
    val reservationId: String? = null,
    val prosumerNic: String? = null,
    val nodeId: String? = null,
    val operatorId: String? = null,
    val energyTransferredKWh: Double? = null,
    val transactionStatus: String? = null,
    val scannedQrCode: String? = null,
    val serverVerified: Boolean? = null,
    val createdAt: String? = null
)