package com.example.microhelio

import android.app.Activity
import android.app.AlertDialog
import android.graphics.Color
import android.view.LayoutInflater
import android.widget.Button
import android.widget.TextView
import org.json.JSONObject

object TransactionReceiptDialog {

    fun show(activity: Activity, trxObj: JSONObject) {
        val dialogView = LayoutInflater.from(activity).inflate(R.layout.dialog_transaction_receipt, null)

        val tvReceiptStatusBadge = dialogView.findViewById<TextView>(R.id.tvReceiptStatusBadge)
        val tvReceiptTrxCode = dialogView.findViewById<TextView>(R.id.tvReceiptTrxCode)
        val tvReceiptProsumerNic = dialogView.findViewById<TextView>(R.id.tvReceiptProsumerNic)
        val tvReceiptNodeId = dialogView.findViewById<TextView>(R.id.tvReceiptNodeId)
        val tvReceiptReservationId = dialogView.findViewById<TextView>(R.id.tvReceiptReservationId)
        val tvReceiptEnergyKWh = dialogView.findViewById<TextView>(R.id.tvReceiptEnergyKWh)
        val tvReceiptTimestamp = dialogView.findViewById<TextView>(R.id.tvReceiptTimestamp)
        val btnCloseReceipt = dialogView.findViewById<Button>(R.id.btnCloseReceipt)

        val status = trxObj.optString("transactionStatus", trxObj.optString("TransactionStatus", "Completed"))
        val code = trxObj.optString("transactionCode", trxObj.optString("TransactionCode", "TRX-N/A"))
        val nic = trxObj.optString("prosumerNic", trxObj.optString("ProsumerNic", "N/A"))
        val nodeId = trxObj.optString("nodeId", trxObj.optString("NodeId", "N/A"))
        val reservationId = trxObj.optString("reservationId", trxObj.optString("ReservationId", "N/A"))
        val kWh = trxObj.optDouble("energyTransferredKWh", trxObj.optDouble("EnergyTransferredKWh", 0.0))
        val createdAt = trxObj.optString("createdAt", trxObj.optString("CreatedAt", ""))
        val dateDisplay = if (createdAt.contains("T")) createdAt.replace("T", " ").split(".")[0] else createdAt

        tvReceiptTrxCode.text = code
        tvReceiptProsumerNic.text = nic
        tvReceiptNodeId.text = nodeId
        tvReceiptReservationId.text = reservationId
        tvReceiptEnergyKWh.text = String.format("%.2f kWh", kWh)
        tvReceiptTimestamp.text = if (dateDisplay.isNotEmpty()) dateDisplay else "Recent"

        tvReceiptStatusBadge.text = status
        if (status.equals("Completed", ignoreCase = true)) {
            tvReceiptStatusBadge.setBackgroundColor(Color.parseColor("#2D6A4F"))
            tvReceiptStatusBadge.text = "Completed ⚡"
        } else {
            tvReceiptStatusBadge.setBackgroundColor(Color.parseColor("#E9C46A"))
            tvReceiptStatusBadge.text = "Initiated"
        }

        val builder = AlertDialog.Builder(activity)
        builder.setView(dialogView)
        val dialog = builder.create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        btnCloseReceipt.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }
}
