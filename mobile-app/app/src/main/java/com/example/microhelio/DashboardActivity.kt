/*
 * Author: Arshvinth S
 * Purpose: Prosumer dashboard activity displaying reservation summary counts and approved upcoming active bookings.
 */
package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class DashboardActivity : AppCompatActivity() {

    // Declare views for counts, welcome banner, and active bookings list
    private lateinit var tvPendingCount: TextView
    private lateinit var tvApprovedCount: TextView
    private lateinit var tvUpcomingCount: TextView
    private lateinit var tvWelcomeNic: TextView
    private lateinit var rvBookings: RecyclerView

    private val baseUrl = "http://localhost:5056/api"
    private val prosumerNic = "981234567V"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dashboard)

        // Initialize UI components from layout
        tvPendingCount = findViewById(R.id.tvPendingCount)
        tvApprovedCount = findViewById(R.id.tvApprovedCount)
        tvUpcomingCount = findViewById(R.id.tvUpcomingCount)
        tvWelcomeNic = findViewById(R.id.tvWelcomeNic)
        rvBookings = findViewById(R.id.rvBookings)

        rvBookings.layoutManager = LinearLayoutManager(this)
        tvWelcomeNic.text = "Prosumer NIC: $prosumerNic"

        // Fetch metrics and active bookings on startup
        fetchDashboardData()
        fetchApprovedActiveBookings()

        // Button to open reservation creation form
        findViewById<Button>(R.id.btnCreateReservation).setOnClickListener {
            startActivity(Intent(this, CreateReservationActivity::class.java))
        }

        // Button to open history list
        findViewById<Button>(R.id.btnViewHistory).setOnClickListener {
            startActivity(Intent(this, BookingHistoryActivity::class.java))
        }

        // Initialize bottom navigation bar actions here
        setupBottomNav()
    }

    override fun onResume() {
        super.onResume()
        // Refresh dashboard counts and active bookings whenever returning to the screen
        fetchDashboardData()
        fetchApprovedActiveBookings()
    }

    private fun setupBottomNav() {
        // Navigate to Dashboard if not already on it
        findViewById<View>(R.id.navDashboard)?.setOnClickListener {
            if (javaClass != DashboardActivity::class.java) {
                startActivity(Intent(this, DashboardActivity::class.java))
                finish()
            }
        }

        // Navigate to Microgrid Node List if not already on it
        findViewById<View>(R.id.navNodes)?.setOnClickListener {
            if (javaClass != NodeListActivity::class.java) {
                startActivity(Intent(this, NodeListActivity::class.java))
                finish()
            }
        }

        // Navigate to Create Reservation if not already on it
        findViewById<View>(R.id.navCreate)?.setOnClickListener {
            if (javaClass != CreateReservationActivity::class.java) {
                startActivity(Intent(this, CreateReservationActivity::class.java))
                finish()
            }
        }

        // Navigate to Booking History if not already on it
        findViewById<View>(R.id.navHistory)?.setOnClickListener {
            if (javaClass != BookingHistoryActivity::class.java) {
                startActivity(Intent(this, BookingHistoryActivity::class.java))
                finish()
            }
        }
    }

    private fun fetchDashboardData() {
        // Fetch dashboard counts in background thread
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

                    // Safely check for both camelCase and PascalCase JSON keys
                    val pending = json.optInt("pendingCount", json.optInt("PendingCount", 0))
                    val approved = json.optInt("approvedCount", json.optInt("ApprovedCount", 0))

                    // Update UI text views on main thread
                    runOnUiThread {
                        tvPendingCount.text = pending.toString()
                        tvApprovedCount.text = approved.toString()
                        tvUpcomingCount.text = approved.toString() // Reflect approved active count as upcoming
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

    private fun fetchApprovedActiveBookings() {
        // Fetch prosumer bookings and filter for approved upcoming sessions
        thread {
            try {
                val url = URL("$baseUrl/reservations?prosumerNic=$prosumerNic")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 5000

                if (connection.responseCode == 200) {
                    val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(responseString)
                    val approvedList = ArrayList<JSONObject>()

                    // Filter list specifically for Approved bookings
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        val status = obj.optString("status", "")
                        if (status.equals("Approved", ignoreCase = true)) {
                            approvedList.add(obj)
                        }
                    }

                    // Populate dashboard RecyclerView adapter on main thread
                    runOnUiThread {
                        rvBookings.adapter = ReservationAdapter(approvedList)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}