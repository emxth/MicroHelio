/*
 * Author: Sewwandi S
 * Purpose: Activity displaying full specification & details for a selected Microgrid Node with Booking Slots display and physical battery slot reservation validation.
 */

package com.example.microhelio

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
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

class NodeDetailsActivity : AppCompatActivity() {

    private lateinit var tvDetailNodeCode: TextView
    private lateinit var tvDetailName: TextView
    private lateinit var tvDetailStatus: TextView
    private lateinit var tvDetailAddress: TextView
    private lateinit var tvDetailCapacity: TextView
    private lateinit var tvDetailBatterySlots: TextView
    private lateinit var tvDetailSchedule: TextView
    private lateinit var tvDetailCoordinates: TextView
    private lateinit var btnBookSlot: Button

    private val baseUrl = "http://10.0.2.2:5056/api"
    private var targetNodeId: String = ""
    private var currentTotalBatterySlots: Int = 10
    private var currentAvailBatterySlots: Int = 10

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_node_details)

        tvDetailNodeCode = findViewById(R.id.tvDetailNodeCode)
        tvDetailName = findViewById(R.id.tvDetailName)
        tvDetailStatus = findViewById(R.id.tvDetailStatus)
        tvDetailAddress = findViewById(R.id.tvDetailAddress)
        tvDetailCapacity = findViewById(R.id.tvDetailCapacity)
        tvDetailBatterySlots = findViewById(R.id.tvDetailBatterySlots)
        tvDetailSchedule = findViewById(R.id.tvDetailSchedule)
        tvDetailCoordinates = findViewById(R.id.tvDetailCoordinates)
        btnBookSlot = findViewById(R.id.btnBookSlot)

        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }

        // Parse node details passed via Intent extras
        targetNodeId = intent.getStringExtra("NODE_ID") ?: ""
        val nodeCode = intent.getStringExtra("NODE_CODE") ?: "Node Details"
        val name = intent.getStringExtra("NODE_NAME") ?: ""
        val address = intent.getStringExtra("NODE_ADDRESS") ?: "N/A"
        val capacity = intent.getDoubleExtra("NODE_CAPACITY", 0.0)
        val totalSlots = intent.getIntExtra("NODE_TOTAL_SLOTS", 10)
        val availSlots = intent.getIntExtra("NODE_AVAIL_SLOTS", 10)
        
        currentTotalBatterySlots = if (totalSlots > 0) totalSlots else 10
        currentAvailBatterySlots = availSlots

        val openTime = intent.getStringExtra("NODE_OPEN_TIME") ?: "08:00"
        val closeTime = intent.getStringExtra("NODE_CLOSE_TIME") ?: "18:00"
        val isActive = intent.getBooleanExtra("NODE_IS_ACTIVE", true)
        val lat = intent.getDoubleExtra("NODE_LAT", 0.0)
        val lng = intent.getDoubleExtra("NODE_LONG", 0.0)
        val operatingDays = intent.getStringExtra("NODE_OPERATING_DAYS") ?: "Mon-Sun"

        // Populate intent data initially
        tvDetailNodeCode.text = nodeCode
        tvDetailName.text = name
        tvDetailAddress.text = address
        tvDetailCapacity.text = "${capacity.toInt()} kWh"
        tvDetailBatterySlots.text = "$currentAvailBatterySlots / $currentTotalBatterySlots Available"
        tvDetailSchedule.text = "$openTime - $closeTime ($operatingDays)"
        tvDetailCoordinates.text = "Lat: $lat, Long: $lng"

        updateStatusBadge(isActive)

        // Load fresh server data
        refreshServerData()

        // Action button to reserve slot at this node directly
        btnBookSlot.setOnClickListener {
            if (currentAvailBatterySlots <= 0) {
                Toast.makeText(this, "No battery slots are currently available at this node.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val intent = Intent(this, CreateReservationActivity::class.java).apply {
                putExtra("SELECTED_NODE_ID", targetNodeId)
            }
            startActivity(intent)
        }

        setupBottomNav()
    }

    override fun onResume() {
        super.onResume()
        // Always refresh from REST API server on resume to ensure latest status and available battery slots
        refreshServerData()
    }

    private fun refreshServerData() {
        if (targetNodeId.isNotEmpty()) {
            fetchNodeDetails(targetNodeId)
        }
    }

    private fun updateStatusBadge(isActive: Boolean) {
        if (isActive) {
            tvDetailStatus.text = "● Active"
            tvDetailStatus.setTextColor(Color.parseColor("#2D6A4F"))
            tvDetailStatus.setBackgroundResource(R.drawable.bg_status_badge_active)
        } else {
            tvDetailStatus.text = "● Inactive"
            tvDetailStatus.setTextColor(Color.parseColor("#C62828"))
            tvDetailStatus.setBackgroundResource(R.drawable.bg_status_badge_inactive)
        }
    }

    private fun fetchNodeDetails(id: String) {
        // Query server for node details in background thread (same pattern as BookingHistoryActivity)
        thread {
            try {
                var url = URL("$baseUrl/microgridnodes/$id")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 3000
                connection.readTimeout = 3000

                var code = try { connection.responseCode } catch (e: Exception) { -1 }

                if (code != 200) {
                    url = URL("http://10.0.2.2:5056/api/microgridnodes/$id")
                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.setRequestProperty("Accept", "application/json")
                    connection.connectTimeout = 3000
                    connection.readTimeout = 3000
                    code = connection.responseCode
                }

                if (code == 200) {
                    val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(responseString)

                    val codeVal = json.optString("nodeCode", json.optString("NodeCode", "Node"))
                    val nameVal = json.optString("name", json.optString("Name", "Microgrid Station"))
                    val addressVal = json.optString("address", json.optString("Address", "N/A"))
                    val capacityVal = json.optDouble("capacityKWh", json.optDouble("CapacityKWh", 0.0))
                    val totalSlotsVal = json.optInt("totalBatterySlots", json.optInt("TotalBatterySlots", 10))
                    val availSlotsVal = json.optInt("availableBatterySlots", json.optInt("AvailableBatterySlots", 10))
                    
                    if (totalSlotsVal > 0) currentTotalBatterySlots = totalSlotsVal
                    currentAvailBatterySlots = availSlotsVal

                    val openTimeVal = json.optString("openTime", json.optString("OpenTime", "08:00"))
                    val closeTimeVal = json.optString("closeTime", json.optString("CloseTime", "18:00"))
                    val daysVal = json.optString("operatingDays", json.optString("OperatingDays", "Mon-Sun"))
                    val isActiveVal = json.optBoolean("isActive", json.optBoolean("IsActive", true))
                    val latVal = json.optDouble("latitude", json.optDouble("Latitude", 0.0))
                    val lngVal = json.optDouble("longitude", json.optDouble("Longitude", 0.0))

                    runOnUiThread {
                        tvDetailNodeCode.text = codeVal
                        tvDetailName.text = nameVal
                        tvDetailAddress.text = addressVal
                        tvDetailCapacity.text = "${capacityVal.toInt()} kWh"
                        tvDetailBatterySlots.text = "$currentAvailBatterySlots / $currentTotalBatterySlots Available"
                        tvDetailSchedule.text = "$openTimeVal - $closeTimeVal ($daysVal)"
                        tvDetailCoordinates.text = "Lat: $latVal, Long: $lngVal"
                        updateStatusBadge(isActiveVal)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun setupBottomNav() {
        findViewById<View>(R.id.navDashboard)?.setOnClickListener {
            if (javaClass != DashboardActivity::class.java) {
                startActivity(Intent(this, DashboardActivity::class.java))
                finish()
            }
        }

        findViewById<View>(R.id.navNodes)?.setOnClickListener {
            if (javaClass != NodeListActivity::class.java) {
                startActivity(Intent(this, NodeListActivity::class.java))
                finish()
            }
        }

        findViewById<View>(R.id.navCreate)?.setOnClickListener {
            if (javaClass != CreateReservationActivity::class.java) {
                startActivity(Intent(this, CreateReservationActivity::class.java))
                finish()
            }
        }

        findViewById<View>(R.id.navHistory)?.setOnClickListener {
            if (javaClass != BookingHistoryActivity::class.java) {
                startActivity(Intent(this, BookingHistoryActivity::class.java))
                finish()
            }
        }
    }
}
