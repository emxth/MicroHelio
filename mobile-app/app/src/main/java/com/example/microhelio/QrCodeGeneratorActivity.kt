package com.example.microhelio

import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.concurrent.thread

class QrCodeGeneratorActivity : AppCompatActivity() {

    private lateinit var ivQrCode: ImageView
    private lateinit var pbQrLoading: ProgressBar
    private lateinit var tvQrStatusBadge: TextView
    private lateinit var tvHmacBadge: TextView
    private lateinit var tvResCode: TextView
    private lateinit var tvProsumerNicDetail: TextView
    private lateinit var tvNodeDetail: TextView
    private lateinit var tvScheduledTimeDetail: TextView
    private lateinit var tvCapacityDetail: TextView
    private lateinit var btnRegenerateQr: Button
    private lateinit var btnDone: Button
    private lateinit var btnBack: ImageView

    private val baseUrl = com.example.microhelio.api.ApiConfig.getApiBaseUrl()

    private var reservationId: String = ""
    private var reservationCode: String = ""
    private var prosumerNic: String = ""
    private var nodeId: String = ""
    private var nodeName: String = ""
    private var scheduledDate: String = ""
    private var timeSlot: String = ""
    private var capacityKWh: Double = 0.0
    private var status: String = "Approved"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_code_generator)

        // Bind layout views
        ivQrCode = findViewById(R.id.ivQrCode)
        pbQrLoading = findViewById(R.id.pbQrLoading)
        tvQrStatusBadge = findViewById(R.id.tvQrStatusBadge)
        tvHmacBadge = findViewById(R.id.tvHmacBadge)
        tvResCode = findViewById(R.id.tvResCode)
        tvProsumerNicDetail = findViewById(R.id.tvProsumerNicDetail)
        tvNodeDetail = findViewById(R.id.tvNodeDetail)
        tvScheduledTimeDetail = findViewById(R.id.tvScheduledTimeDetail)
        tvCapacityDetail = findViewById(R.id.tvCapacityDetail)
        btnRegenerateQr = findViewById(R.id.btnRegenerateQr)
        btnDone = findViewById(R.id.btnDone)
        btnBack = findViewById(R.id.btnBack)

        // Unpack Intent Extras
        reservationId = intent.getStringExtra("RESERVATION_ID") ?: ""
        reservationCode = intent.getStringExtra("RESERVATION_CODE") ?: "N/A"
        prosumerNic = intent.getStringExtra("PROSUMER_NIC") ?: ""
        nodeId = intent.getStringExtra("NODE_ID") ?: ""
        nodeName = intent.getStringExtra("NODE_NAME") ?: "Microgrid Node"
        scheduledDate = intent.getStringExtra("SCHEDULED_DATE") ?: ""
        timeSlot = intent.getStringExtra("SCHEDULED_TIME") ?: ""
        capacityKWh = intent.getDoubleExtra("CAPACITY", 0.0)
        status = intent.getStringExtra("STATUS") ?: "Approved"

        if (prosumerNic.isEmpty()) {
            val session = SessionManager(this).getSession()
            prosumerNic = session?.accountIdentifier ?: "Unknown"
        }

        // Display text details
        tvResCode.text = reservationCode
        tvProsumerNicDetail.text = prosumerNic
        tvNodeDetail.text = nodeName
        tvScheduledTimeDetail.text = "$scheduledDate | $timeSlot"
        tvCapacityDetail.text = "$capacityKWh KWh"
        tvQrStatusBadge.text = "Status: $status"

        // Wire up buttons
        btnBack.setOnClickListener { finish() }
        btnDone.setOnClickListener { finish() }

        btnRegenerateQr.setOnClickListener {
            fetchOrGenerateQrPayload()
        }

        // Fetch and generate QR Payload
        fetchOrGenerateQrPayload()
    }

    private fun fetchOrGenerateQrPayload() {
        if (reservationId.isEmpty()) {
            Toast.makeText(this, "Reservation ID missing. Generating local fallback QR payload.", Toast.LENGTH_SHORT).show()
            renderQrCode(generateLocalQrPayload())
            return
        }

        pbQrLoading.visibility = View.VISIBLE
        ivQrCode.visibility = View.INVISIBLE

        thread {
            try {
                val url = URL("$baseUrl/EnergyReservations/$reservationId/generate-qr")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 4000
                connection.readTimeout = 4000

                val code = connection.responseCode
                if (code == 200) {
                    val responseText = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonResponse = JSONObject(responseText)
                    val rawPayloadString = jsonResponse.optString("payload", "")

                    runOnUiThread {
                        pbQrLoading.visibility = View.GONE
                        ivQrCode.visibility = View.VISIBLE
                        if (rawPayloadString.isNotEmpty()) {
                            renderQrCode(rawPayloadString)
                            Toast.makeText(this, "QR payload generated & verified by server", Toast.LENGTH_SHORT).show()
                        } else {
                            renderQrCode(generateLocalQrPayload())
                        }
                    }
                } else {
                    runOnUiThread {
                        pbQrLoading.visibility = View.GONE
                        ivQrCode.visibility = View.VISIBLE
                        // Fallback to local signed payload if backend server returns non-200
                        renderQrCode(generateLocalQrPayload())
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    pbQrLoading.visibility = View.GONE
                    ivQrCode.visibility = View.VISIBLE
                    // Fallback to local signed payload if network fails
                    renderQrCode(generateLocalQrPayload())
                }
            }
        }
    }

    private fun generateLocalQrPayload(): String {
        // Construct standard message string for HMAC signature matching backend specification:
        // Message = $"{reservationId}{prosumerNic}{nodeId}{scheduledDate}"
        val formattedDate = if (scheduledDate.contains("T")) scheduledDate.split("T")[0] else scheduledDate
        val messageToHash = "$reservationId$prosumerNic$nodeId$formattedDate"
        val secretKey = "MicroHelio_Secret_HMAC_Key_2026!"

        val signature = computeHmacSha256(messageToHash, secretKey)

        val payloadObj = JSONObject().apply {
            put("reservationId", reservationId)
            put("prosumerNic", prosumerNic)
            put("nodeId", nodeId)
            put("scheduledDate", formattedDate)
            put("hmacSignature", signature)
        }

        return payloadObj.toString()
    }

    private fun computeHmacSha256(data: String, key: String): String {
        return try {
            val secretKeySpec = SecretKeySpec(key.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(secretKeySpec)
            val hash = mac.doFinal(data.toByteArray(StandardCharsets.UTF_8))
            android.util.Base64.encodeToString(hash, android.util.Base64.NO_WRAP)
        } catch (e: Exception) {
            "SIGNATURE_ERROR"
        }
    }

    private fun renderQrCode(payloadText: String) {
        try {
            val bitmap = SimpleQrEncoder.generateQrBitmap(payloadText, 512)
            ivQrCode.setImageBitmap(bitmap)
            tvHmacBadge.text = "HMAC-SHA256 Signed & Ready for Scan"
        } catch (e: Exception) {
            Toast.makeText(this, "Error rendering QR code: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
