package com.example.microhelio

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.microhelio.api.ApiConfig
import androidx.activity.result.contract.ActivityResultContracts
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class GridOperatorDashboardActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager
    private lateinit var dbHelper: LocalDatabaseHelper

    private lateinit var tvWelcome: TextView
    private lateinit var btnLogout: Button
    private lateinit var btnScanQrCode: Button
    private lateinit var btnPastePayload: Button

    private lateinit var cvTransactionResult: View
    private lateinit var tvVerifyStatusHeader: TextView
    private lateinit var tvTrxBadge: TextView
    private lateinit var tvTrxCode: TextView
    private lateinit var tvTrxProsumerNic: TextView
    private lateinit var tvTrxReservationId: TextView
    private lateinit var tvTrxNodeId: TextView

    private lateinit var llTransferCompletionPanel: LinearLayout
    private lateinit var etEnergyKWh: EditText
    private lateinit var btnCompleteTransfer: Button

    private lateinit var btnRefreshTransactions: Button
    private lateinit var pbHistoryLoading: ProgressBar
    private lateinit var rvTransactions: RecyclerView
    private lateinit var adapter: TransactionAdapter
    private val transactionList = ArrayList<JSONObject>()

    private val baseUrl = ApiConfig.getApiBaseUrl()

    private var currentActiveTransactionId: String = ""
    private var currentOperatorId: String = ""

    // Modern Activity Result API launcher for ZXing barcode scanning
    private val qrScannerLauncher =
        registerForActivityResult(ScanContract()) { result ->
            val contents = result.contents

            if (contents != null) {
                Toast.makeText(
                    this,
                    "QR Scanned Successfully",
                    Toast.LENGTH_SHORT
                ).show()

                processQrPayload(contents)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_grid_operator_dashboard)

        sessionManager = SessionManager(this)
        dbHelper = LocalDatabaseHelper(this)

        // Bind layout views
        tvWelcome = findViewById(R.id.tvGridOpWelcome)
        btnLogout = findViewById(R.id.btnGridOpLogout)
        btnScanQrCode = findViewById(R.id.btnScanQrCode)
        // btnPastePayload = findViewById(R.id.btnPastePayload)

        cvTransactionResult = findViewById(R.id.cvTransactionResult)
        tvVerifyStatusHeader = findViewById(R.id.tvVerifyStatusHeader)
        tvTrxBadge = findViewById(R.id.tvTrxBadge)
        tvTrxCode = findViewById(R.id.tvTrxCode)
        tvTrxProsumerNic = findViewById(R.id.tvTrxProsumerNic)
        tvTrxReservationId = findViewById(R.id.tvTrxReservationId)
        tvTrxNodeId = findViewById(R.id.tvTrxNodeId)

        llTransferCompletionPanel = findViewById(R.id.llTransferCompletionPanel)
        etEnergyKWh = findViewById(R.id.etEnergyKWh)
        btnCompleteTransfer = findViewById(R.id.btnCompleteTransfer)

        btnRefreshTransactions = findViewById(R.id.btnRefreshTransactions)
        pbHistoryLoading = findViewById(R.id.pbHistoryLoading)
        rvTransactions = findViewById(R.id.rvTransactions)

        rvTransactions.layoutManager = LinearLayoutManager(this)
        adapter = TransactionAdapter(transactionList) { selectedItem ->
            val status = selectedItem.optString("transactionStatus", "Initiated")
            val id = selectedItem.optString("id", selectedItem.optString("_id"))
            val code = selectedItem.optString("transactionCode", "TRX-N/A")
            val nic = selectedItem.optString("prosumerNic", "N/A")
            val reservationId = selectedItem.optString("reservationId", "N/A")
            val nodeId = selectedItem.optString("nodeId", "N/A")

            currentActiveTransactionId = id

            cvTransactionResult.visibility = View.VISIBLE
            tvVerifyStatusHeader.text = if (status == "Completed") "Transaction Completed" else "Transaction Selected"
            tvTrxBadge.text = status
            tvTrxBadge.setBackgroundColor(
                if (status == "Completed") Color.parseColor("#2D6A4F") else Color.parseColor("#E9C46A")
            )
            tvTrxCode.text = "Code: $code"
            tvTrxProsumerNic.text = "Prosumer NIC: $nic"
            tvTrxReservationId.text = "Reservation ID: $reservationId"
            tvTrxNodeId.text = "Node ID: $nodeId"

            if (status == "Initiated") {
                llTransferCompletionPanel.visibility = View.VISIBLE
                Toast.makeText(this, "Selected transaction $code for completion", Toast.LENGTH_SHORT).show()
            } else {
                llTransferCompletionPanel.visibility = View.GONE
                // Show Digital Receipt for completed transactions
                TransactionReceiptDialog.show(this, selectedItem)
            }
        }
        rvTransactions.adapter = adapter

        // Get Session Operator Data
        val session = sessionManager.getSession()
        if (session != null && session.fullName.isNotBlank()) {
            tvWelcome.text = "Welcome, ${session.fullName}"
            currentOperatorId = session.accountId
        }

        // Wire Up Action Handlers
        btnLogout.setOnClickListener {
            sessionManager.clearSession()
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }

        // LAUNCH CAMERA QR SCANNER
        btnScanQrCode.setOnClickListener {
            startCameraQrScanner()
        }

        // MANUAL / PASTE QR PAYLOAD DIALOG
        btnPastePayload.setOnClickListener {
            showPayloadInputDialog("Enter QR Payload")
        }

        btnCompleteTransfer.setOnClickListener {
            val energyText = etEnergyKWh.text.toString().trim()
            val energyVal = energyText.toDoubleOrNull()
            if (energyVal == null || energyVal <= 0.0) {
                Toast.makeText(this, "Please enter a valid KWh amount > 0", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (currentActiveTransactionId.isNotEmpty()) {
                completeEnergyTransaction(currentActiveTransactionId, energyVal)
            } else {
                Toast.makeText(this, "No active transaction selected to complete", Toast.LENGTH_SHORT).show()
            }
        }

        btnRefreshTransactions.setOnClickListener {
            fetchOperatorTransactions()
        }

        // Fetch transaction history on screen load
        fetchOperatorTransactions()
    }

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                launchCameraScanner()
            } else {
                Toast.makeText(this, "Camera permission is required to scan QR code", Toast.LENGTH_SHORT).show()
                showPayloadInputDialog("Enter QR Payload")
            }
        }

    private fun startCameraQrScanner() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
            launchCameraScanner()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun launchCameraScanner() {
        try {
            val options = ScanOptions()
            options.setPrompt("Scan Prosumer Reservation QR Code")
            options.setBeepEnabled(true)
            options.setOrientationLocked(true)
            options.setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            options.captureActivity = PortraitCaptureActivity::class.java
            qrScannerLauncher.launch(options)
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback to manual payload input dialog if ZXing scanner is unavailable
            showPayloadInputDialog("Enter QR Payload")
        }
    }

    private fun showPayloadInputDialog(title: String) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle(title)
        builder.setMessage("Scan QR code or paste the signed reservation QR payload JSON below:")

        val input = EditText(this)
        input.hint = "Paste {\"reservationId\":\"...\", \"prosumerNic\":\"...\", ...}"
        input.setPadding(32, 24, 32, 24)
        builder.setView(input)

        builder.setPositiveButton("Verify & Initiate") { dialog, _ ->
            val payloadText = input.text.toString().trim()
            if (payloadText.isNotEmpty()) {
                processQrPayload(payloadText)
            } else {
                Toast.makeText(this, "QR Payload cannot be empty", Toast.LENGTH_SHORT).show()
            }
            dialog.dismiss()
        }

        builder.setNegativeButton("Cancel") { dialog, _ ->
            dialog.cancel()
        }

        builder.show()
    }

    private fun processQrPayload(qrPayload: String) {
        thread {
            try {
                val userToken = sessionManager.getSession()?.token ?: ""

                // 1. Verification Request
                val verifyUrl = URL("$baseUrl/Transactions/verify")
                val verifyConn = verifyUrl.openConnection() as HttpURLConnection
                verifyConn.requestMethod = "POST"
                verifyConn.setRequestProperty("Content-Type", "application/json")
                verifyConn.setRequestProperty("Accept", "application/json")
                if (userToken.isNotEmpty()) {
                    verifyConn.setRequestProperty("Authorization", "Bearer $userToken")
                }
                verifyConn.doOutput = true
                verifyConn.connectTimeout = 4000

                val jsonPayloadBody = if (qrPayload.startsWith("{")) qrPayload else "\"$qrPayload\""
                OutputStreamWriter(verifyConn.outputStream).use { it.write(jsonPayloadBody) }

                val verifyCode = verifyConn.responseCode
                if (verifyCode != 200) {
                    val errMessage = try {
                        verifyConn.errorStream.bufferedReader().use { it.readText() }
                    } catch (e: Exception) {
                        "Invalid or tampered QR code payload."
                    }

                    runOnUiThread {
                        cvTransactionResult.visibility = View.GONE
                        showErrorDialog("QR Verification Failed", errMessage)
                    }
                    return@thread
                }

                val payloadJson = JSONObject(qrPayload)
                val reservationId = payloadJson.optString("reservationId", "")
                val prosumerNic = payloadJson.optString("prosumerNic", "")
                val nodeId = payloadJson.optString("nodeId", "")

                // 2. Initiate Transaction Request
                val initiateUrl = URL("$baseUrl/Transactions")
                val initiateConn = initiateUrl.openConnection() as HttpURLConnection
                initiateConn.requestMethod = "POST"
                initiateConn.setRequestProperty("Content-Type", "application/json")
                initiateConn.setRequestProperty("Accept", "application/json")
                if (userToken.isNotEmpty()) {
                    initiateConn.setRequestProperty("Authorization", "Bearer $userToken")
                }
                initiateConn.doOutput = true

                val initBody = JSONObject().apply {
                    put("reservationId", reservationId)
                    put("prosumerNic", prosumerNic)
                    put("nodeId", nodeId)
                    put("scannedQrCode", qrPayload)
                }

                OutputStreamWriter(initiateConn.outputStream).use { it.write(initBody.toString()) }

                val initiateCode = initiateConn.responseCode
                if (initiateCode == 200 || initiateCode == 201) {
                    val responseText = initiateConn.inputStream.bufferedReader().use { it.readText() }
                    val trxJson = JSONObject(responseText)

                    val trxId = trxJson.optString("id", trxJson.optString("_id"))
                    val trxCode = trxJson.optString("transactionCode", "TRX-INITIATED")
                    currentActiveTransactionId = trxId

                    // Cache to SQLite
                    dbHelper.saveOrUpdateTransaction(trxJson)

                    runOnUiThread {
                        cvTransactionResult.visibility = View.VISIBLE
                        tvVerifyStatusHeader.text = "Transaction Initiated"
                        tvTrxBadge.text = "Verified"
                        tvTrxBadge.setBackgroundColor(Color.parseColor("#52B788"))
                        tvTrxCode.text = "Code: $trxCode"
                        tvTrxProsumerNic.text = "Prosumer NIC: $prosumerNic"
                        tvTrxReservationId.text = "Reservation ID: $reservationId"
                        tvTrxNodeId.text = "Node ID: $nodeId"
                        llTransferCompletionPanel.visibility = View.VISIBLE

                        Toast.makeText(this, "QR payload verified & transaction initiated!", Toast.LENGTH_LONG).show()
                        fetchOperatorTransactions()
                    }
                } else {
                    val initErrText = try {
                        initiateConn.errorStream.bufferedReader().use { it.readText() }
                    } catch (e: Exception) {
                        "Failed to initiate transaction on server."
                    }
                    runOnUiThread {
                        showErrorDialog("Initiation Failed", initErrText)
                    }
                }

            } catch (e: Exception) {
                runOnUiThread {
                    showErrorDialog("Network Error", "Error connecting to server: ${e.message}")
                }
            }
        }
    }

    private fun setHttpMethodPatch(connection: HttpURLConnection) {
        try {
            val methodField = HttpURLConnection::class.java.getDeclaredField("method")
            methodField.isAccessible = true
            methodField.set(connection, "PATCH")
        } catch (e: Exception) {
            connection.requestMethod = "POST"
            connection.setRequestProperty("X-HTTP-Method-Override", "PATCH")
        }
    }

    private fun completeEnergyTransaction(trxId: String, energyKWh: Double) {
        thread {
            try {
                val userToken = sessionManager.getSession()?.token ?: ""
                val completeUrl = URL("$baseUrl/Transactions/$trxId/complete")
                val connection = completeUrl.openConnection() as HttpURLConnection
                setHttpMethodPatch(connection)
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Accept", "application/json")
                if (userToken.isNotEmpty()) {
                    connection.setRequestProperty("Authorization", "Bearer $userToken")
                }
                connection.doOutput = true

                OutputStreamWriter(connection.outputStream).use { it.write(energyKWh.toString()) }

                val code = connection.responseCode
                if (code == 200) {
                    val completedTrxObj = JSONObject().apply {
                        put("id", trxId)
                        put("transactionCode", tvTrxCode.text.toString().replace("Code: ", ""))
                        put("prosumerNic", tvTrxProsumerNic.text.toString().replace("Prosumer NIC: ", ""))
                        put("nodeId", tvTrxNodeId.text.toString().replace("Node ID: ", ""))
                        put("reservationId", tvTrxReservationId.text.toString().replace("Reservation ID: ", ""))
                        put("energyTransferredKWh", energyKWh)
                        put("transactionStatus", "Completed")
                    }

                    // Save to SQLite local database
                    dbHelper.saveOrUpdateTransaction(completedTrxObj)

                    runOnUiThread {
                        tvVerifyStatusHeader.text = "Transaction Completed"
                        tvTrxBadge.text = "Completed"
                        tvTrxBadge.setBackgroundColor(Color.parseColor("#2D6A4F"))
                        llTransferCompletionPanel.visibility = View.GONE
                        etEnergyKWh.setText("")
                        Toast.makeText(this, "Energy transfer completed successfully!", Toast.LENGTH_LONG).show()

                        // Automatically display digital receipt modal
                        TransactionReceiptDialog.show(this@GridOperatorDashboardActivity, completedTrxObj)
                        fetchOperatorTransactions()
                    }
                } else {
                    val errMessage = try {
                        connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Error $code"
                    } catch (e: Exception) {
                        "Server error code: $code"
                    }
                    runOnUiThread {
                        showErrorDialog("Completion Failed", errMessage)
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this, "Error completing transaction: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun fetchOperatorTransactions() {
        pbHistoryLoading.visibility = View.VISIBLE
        thread {
            try {
                val userToken = sessionManager.getSession()?.token ?: ""
                val queryParam = if (currentOperatorId.isNotEmpty()) "?operatorId=$currentOperatorId" else ""
                val url = URL("$baseUrl/Transactions$queryParam")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                if (userToken.isNotEmpty()) {
                    connection.setRequestProperty("Authorization", "Bearer $userToken")
                }

                if (connection.responseCode == 200) {
                    val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(responseText)

                    transactionList.clear()
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        transactionList.add(obj)
                        dbHelper.saveOrUpdateTransaction(obj) // Cache into SQLite
                    }

                    runOnUiThread {
                        pbHistoryLoading.visibility = View.GONE
                        adapter.notifyDataSetChanged()
                    }
                } else {
                    val cached = dbHelper.getCachedTransactions()
                    runOnUiThread {
                        pbHistoryLoading.visibility = View.GONE
                        if (cached.isNotEmpty()) {
                            transactionList.clear()
                            transactionList.addAll(cached)
                            adapter.notifyDataSetChanged()
                        }
                    }
                }
            } catch (e: Exception) {
                val cached = dbHelper.getCachedTransactions()
                runOnUiThread {
                    pbHistoryLoading.visibility = View.GONE
                    if (cached.isNotEmpty()) {
                        transactionList.clear()
                        transactionList.addAll(cached)
                        adapter.notifyDataSetChanged()
                    }
                }
            }
        }
    }

    private fun showErrorDialog(title: String, message: String) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK") { dialog, _ -> dialog.dismiss() }
            .show()
    }
}
