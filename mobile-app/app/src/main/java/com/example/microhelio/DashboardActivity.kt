/*
 * Author: Ashwin
 * Purpose: Prosumer dashboard activity displaying reservation summary counts and active bookings.
 */
package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class DashboardActivity : AppCompatActivity() {

    private lateinit var tvPendingCount: TextView
    private lateinit var tvApprovedCount: TextView
    private lateinit var tvUpcomingCount: TextView
    private lateinit var tvWelcomeNic: TextView

    private val baseUrl = "http://localhost:5056/api"
    private val prosumerNic = "981234567V"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)

        tvPendingCount = findViewById(R.id.tvPendingCount)
        tvApprovedCount = findViewById(R.id.tvApprovedCount)
        tvUpcomingCount = findViewById(R.id.tvUpcomingCount)
        tvWelcomeNic = findViewById(R.id.tvWelcomeNic)

        tvWelcomeNic.text = "Prosumer NIC: $prosumerNic"

        fetchDashboardData()

        findViewById<Button>(R.id.btnCreateReservation).setOnClickListener {
            startActivity(Intent(this, CreateReservationActivity::class.java))
        }

        findViewById<Button>(R.id.btnViewHistory).setOnClickListener {
            startActivity(Intent(this, BookingHistoryActivity::class.java))
        }
    }

    override fun onResume() {
        super.onResume()
        fetchDashboardData()
    }

    private fun fetchDashboardData() {
        thread {
            try {
                val url = URL("$baseUrl/reservations/dashboard?prosumerNic=$prosumerNic")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 5000 // 5 second timeout
                connection.readTimeout = 5000

                val code = connection.responseCode
                if (code == 200) {
                    val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(responseString)

                    // Safely check for both camelCase and PascalCase
                    val pending = json.optInt("pendingCount", json.optInt("PendingCount", 0))
                    val approved = json.optInt("approvedCount", json.optInt("ApprovedCount", 0))

                    runOnUiThread {
                        tvPendingCount.text = pending.toString()
                        tvApprovedCount.text = approved.toString()
                        tvUpcomingCount.text = "0"
                    }
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown API Error"
                    runOnUiThread { Toast.makeText(this@DashboardActivity, "API Error $code: $errorStream", Toast.LENGTH_LONG).show() }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { Toast.makeText(this@DashboardActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }
}