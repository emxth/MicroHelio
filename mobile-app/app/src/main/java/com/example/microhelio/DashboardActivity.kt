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
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class DashboardActivity : AppCompatActivity() {

    private lateinit var tvPendingCount: TextView
    private lateinit var tvApprovedCount: TextView
    private lateinit var tvUpcomingCount: TextView
    private lateinit var tvWelcomeNic: TextView
    private lateinit var rvBookings: RecyclerView

    private val baseUrl = "https://10.0.2.2:5056/api" // Use 10.0.2.2 for Android Emulator connecting to local IIS/.NET API
    private val prosumerNic = "981234567V" // Normally fetched from SQLite local_session table

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)

        tvPendingCount = findViewById(R.id.tvPendingCount)
        tvApprovedCount = findViewById(R.id.tvApprovedCount)
        tvUpcomingCount = findViewById(R.id.tvUpcomingCount)
        tvWelcomeNic = findViewById(R.id.tvWelcomeNic)
        rvBookings = findViewById(R.id.rvBookings)

        tvWelcomeNic.text = "Prosumer NIC: $prosumerNic"

        rvBookings.layoutManager = LinearLayoutManager(this)

        // Load dashboard metrics and bookings from API
        fetchDashboardData()

        findViewById<Button>(R.id.btnCreateReservation).setOnClickListener {
            val intent = Intent(this, CreateReservationActivity::class.java)
            startActivity(intent)
        }

        findViewById<Button>(R.id.btnViewHistory).setOnClickListener {
            val intent = Intent(this, BookingHistoryActivity::class.java)
            startActivity(intent)
//            Toast.makeText(this, "Navigate to Booking History", Toast.LENGTH_SHORT).show()
        }
    }

    private fun fetchDashboardData() {
        thread {
            try {
                // 1. Fetch Dashboard Counts: GET /api/reservations/dashboard?prosumerNic={nic}
                val countUrl = URL("$baseUrl/reservations/dashboard?prosumerNic=$prosumerNic")
                val countConnection = countUrl.openConnection() as HttpURLConnection
                countConnection.requestMethod = "GET"
                countConnection.setRequestProperty("Accept", "application/json")

                if (countConnection.responseCode == 200) {
                    val responseString = countConnection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(responseString)

                    val pending = json.optInt("pendingCount", 0)
                    val approved = json.optInt("approvedCount", 0)
                    val upcoming = json.optInt("upcomingCount", 0)

                    runOnUiThread {
                        tvPendingCount.text = pending.toString()
                        tvApprovedCount.text = approved.toString()
                        tvUpcomingCount.text = upcoming.toString()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this, "Failed to load dashboard counts", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}