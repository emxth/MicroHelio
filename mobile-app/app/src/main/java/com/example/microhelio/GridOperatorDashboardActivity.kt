package com.example.microhelio

import com.example.microhelio.LoginActivity
import com.example.microhelio.R
import com.example.microhelio.TransactionAdapter
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
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.microhelio.api.ApiConfig
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class GridOperatorDashboardActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_grid_operator_dashboard)

        sessionManager = SessionManager(this)

        // Bind layout views
        tvWelcome = findViewById(R.id.tvGridOpWelcome)
        btnLogout = findViewById(R.id.btnGridOpLogout)
        btnScanQrCode = findViewById(R.id.btnScanQrCode)
        btnPastePayload = findViewById(R.id.btnPastePayload)

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
        adapter = TransactionAdapter(transactionList)
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
            }
        }

        btnRefreshTransactions.setOnClickListener {
            fetchOperatorTransactions()
        }

        // Fetch transaction history on screen load
        fetchOperatorTransactions()
    }

    private fun startCameraQrScanner() {
        try {
            val clazz = Class.forName("com.google.zxing.integration.android.IntentIntegrator")
            val constructor = clazz.getConstructor(android.app.Activity::class.java)
            val integrator = constructor.newInstance(this)

            val setPrompt = clazz.getMethod("setPrompt", String::class.java)
            setPrompt.invoke(integrator, "Scan Prosumer Reservation QR Code")

            val setBeepEnabled = clazz.getMethod("setBeepEnabled", Boolean::class.javaPrimitiveType)
            setBeepEnabled.invoke(integrator, true)

            val setOrientationLocked = clazz.getMethod("setOrientationLocked", Boolean::class.javaPrimitiveType)
            setOrientationLocked.invoke(integrator, false)

            val initiateScan = clazz.getMethod("initiateScan")
            initiateScan.invoke(integrator)
        } catch (e: Exception) {
            // Fallback to manual payload input dialog if ZXing scanner is unavailable
            showPayloadInputDialog("Enter QR Payload")
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        try {
            val clazz = Class.forName("com.google.zxing.integration.android.IntentIntegrator")
            val parseMethod = clazz.getMethod("parseActivityResult", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType, Intent::class.java)
            val result = parseMethod.invoke(null, requestCode, resultCode, data)
            if (result != null) {
                val getContents = result.javaClass.getMethod("getContents")
                val scannedPayload = getContents.invoke(result) as? String
                if (!scannedPayload.isNullOrEmpty()) {
                    Toast.makeText(this, "QR Scanned Successfully", Toast.LENGTH_SHORT).show()
                    processQrPayload(scannedPayload)
                    return
                }
            }
        } catch (e: Exception) {
            // Ignore reflection error and proceed with standard callback
        }
        super.onActivityResult(requestCode, resultCode, data)
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

    private fun completeEnergyTransaction(trxId: String, energyKWh: Double) {
        thread {
            try {
                val userToken = sessionManager.getSession()?.token ?: ""
                val completeUrl = URL("$baseUrl/Transactions/$trxId/complete")
                val connection = completeUrl.openConnection() as HttpURLConnection
                connection.requestMethod = "PATCH"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Accept", "application/json")
                if (userToken.isNotEmpty()) {
                    connection.setRequestProperty("Authorization", "Bearer $userToken")
                }
                connection.doOutput = true

                OutputStreamWriter(connection.outputStream).use { it.write(energyKWh.toString()) }

                val code = connection.responseCode
                if (code == 200) {
                    runOnUiThread {
                        tvVerifyStatusHeader.text = "Transaction Completed"
                        tvTrxBadge.text = "Completed ⚡"
                        tvTrxBadge.setBackgroundColor(Color.parseColor("#2D6A4F"))
                        llTransferCompletionPanel.visibility = View.GONE
                        Toast.makeText(this, "Energy transfer completed successfully!", Toast.LENGTH_LONG).show()
                        fetchOperatorTransactions()
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this, "Failed to complete transaction. Server code: $code", Toast.LENGTH_SHORT).show()
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
                        transactionList.add(jsonArray.getJSONObject(i))
                    }

                    runOnUiThread {
                        pbHistoryLoading.visibility = View.GONE
                        adapter.notifyDataSetChanged()
                    }
                } else {
                    runOnUiThread {
                        pbHistoryLoading.visibility = View.GONE
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    pbHistoryLoading.visibility = View.GONE
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
