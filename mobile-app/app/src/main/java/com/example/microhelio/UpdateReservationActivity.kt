/*
 * Author: Arshvinth S
 * Purpose: Interactive native activity for updating or cancelling reservations with prefilled dropdown state.
 */
package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class UpdateReservationActivity : AppCompatActivity() {

    // Declare layout view references
    private lateinit var spinnerNodes: Spinner
    private lateinit var spinnerSlots: Spinner
    private lateinit var tvSelectedSlotDetails: TextView
    private lateinit var etCancelReason: EditText
    private lateinit var btnUpdateReservation: Button
    private lateinit var btnCancelReservation: Button
    private lateinit var btnBack: ImageView

    private val baseUrl = "http://localhost:5056/api"

    private val nodeList = ArrayList<JSONObject>()
    private val slotList = ArrayList<JSONObject>()

    private var reservationId: String = ""
    private var existingNodeId: String = ""
    private var existingSlotId: String = ""
    private var selectedNodeId: String = ""
    private var selectedSlotId: String = ""
    private var selectedDateString: String = ""
    private var selectedStartTime: String = ""
    private var selectedEndTime: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_update_reservation)

        // Bind layout components
        spinnerNodes = findViewById(R.id.spinnerNodes)
        spinnerSlots = findViewById(R.id.spinnerSlots)
        tvSelectedSlotDetails = findViewById(R.id.tvSelectedSlotDetails)
        etCancelReason = findViewById(R.id.etCancelReason)
        btnUpdateReservation = findViewById(R.id.btnUpdateReservation)
        btnCancelReservation = findViewById(R.id.btnCancelReservation)
        btnBack = findViewById(R.id.btnBack)

        // Handle back button click to return to previous screen
        btnBack.setOnClickListener {
            finish()
        }

        // Get reservation ID passed from history adapter click
        reservationId = intent.getStringExtra("RESERVATION_ID") ?: ""

        // Fetch details if ID is valid
        if (reservationId.isNotEmpty()) {
            fetchReservationDetails(reservationId)
        } else {
            Toast.makeText(this, "Error: Invalid Reservation ID", Toast.LENGTH_SHORT).show()
        }

        // Set click listeners for actions
        btnUpdateReservation.setOnClickListener { updateReservation() }
        btnCancelReservation.setOnClickListener { cancelReservation() }

        // Initialize bottom navigation bar actions here
        setupBottomNav()
    }

    private fun setupBottomNav() {
        // Navigate to Dashboard if not already on it
        findViewById<View>(R.id.navDashboard)?.setOnClickListener {
            if (javaClass != DashboardActivity::class.java) {
                startActivity(Intent(this, DashboardActivity::class.java))
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

    private fun fetchReservationDetails(id: String) {
        // Fetch current booking data from API
        thread {
            try {
                val url = URL("$baseUrl/reservations/$id")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)

                    existingNodeId = json.optString("nodeId")
                    existingSlotId = json.optString("slotId")
                    selectedDateString = json.optString("scheduledDate")
                    selectedStartTime = json.optString("scheduledStartTime")
                    selectedEndTime = json.optString("scheduledEndTime")

                    // Display current slot summary on UI
                    runOnUiThread {
                        tvSelectedSlotDetails.text = "Current: $selectedStartTime - $selectedEndTime on ${selectedDateString.split("T")[0]}"
                    }

                    // Now load nodes and pre-select the existing node
                    fetchMicrogridNodes()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun fetchMicrogridNodes() {
        // Fetch nodes list for dropdown selection
        thread {
            try {
                val url = URL("$baseUrl/nodes")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(response)
                    nodeList.clear()

                    val displayNames = ArrayList<String>()
                    var preselectIndex = 0

                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        nodeList.add(obj)

                        // Support both camelCase and PascalCase keys from C# backend
                        val nodeName = if (obj.has("name")) obj.optString("name") else obj.optString("Name", "Unknown Node")
                        val nodeAddress = if (obj.has("address")) obj.optString("address") else obj.optString("Address", "")
                        val nodeCode = if (obj.has("nodeCode")) obj.optString("nodeCode") else obj.optString("NodeCode", "")

                        val displayString = if (nodeAddress.isNotEmpty()) {
                            "$nodeCode - $nodeName ($nodeAddress)"
                        } else {
                            "$nodeCode - $nodeName"
                        }
                        displayNames.add(displayString)

                        // Check both "id" and "_id" for MongoDB compatibility
                        val objId = obj.optString("id", obj.optString("_id"))
                        if (objId == existingNodeId) {
                            preselectIndex = i
                        }
                    }

                    // Populate node spinner and preselect active node on main thread
                    runOnUiThread {
                        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, displayNames)
                        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                        spinnerNodes.adapter = adapter
                        if (displayNames.isNotEmpty()) {
                            spinnerNodes.setSelection(preselectIndex)
                        }

                        spinnerNodes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                                val node = nodeList[position]
                                selectedNodeId = node.optString("id", node.optString("_id"))
                                fetchSlotsForNode(selectedNodeId)
                            }
                            override fun onNothingSelected(parent: AdapterView<*>) {}
                        }
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, "Failed to load nodes: HTTP $responseCode", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this@UpdateReservationActivity, "Node Load Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
                runOnUiThread {
                    selectedNodeId = existingNodeId
                    fetchSlotsForNode(selectedNodeId)
                }
            }
        }
    }

    private fun fetchSlotsForNode(nodeId: String) {
        // Fetch available slots for the selected node
        thread {
            try {
                val url = URL("$baseUrl/slots?nodeId=$nodeId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(response)
                    slotList.clear()

                    val slotDisplays = ArrayList<String>()
                    var preselectIndex = 0

                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        slotList.add(obj)
                        val date = obj.optString("slotDate").split("T")[0]
                        slotDisplays.add("$date | ${obj.optString("slotStartTime")} - ${obj.optString("slotEndTime")} (${obj.optDouble("availableCapacityKWh")} kWh left)")

                        val slotId = obj.optString("id", obj.optString("_id"))
                        if (slotId == existingSlotId) {
                            preselectIndex = i
                        }
                    }

                    // Populate slots spinner and preselect current slot
                    runOnUiThread {
                        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, slotDisplays)
                        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                        spinnerSlots.adapter = adapter
                        if (slotDisplays.isNotEmpty()) {
                            spinnerSlots.setSelection(preselectIndex)
                        }

                        spinnerSlots.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                                val slot = slotList[position]
                                selectedSlotId = slot.optString("id", slot.optString("_id"))
                                selectedDateString = slot.optString("slotDate")
                                selectedStartTime = slot.optString("slotStartTime")
                                selectedEndTime = slot.optString("slotEndTime")

                                tvSelectedSlotDetails.text = "New Selection: $selectedStartTime - $selectedEndTime on ${selectedDateString.split("T")[0]}"
                            }
                            override fun onNothingSelected(parent: AdapterView<*>) {}
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun updateReservation() {
        // Validate before sending PUT update request
        if (reservationId.isEmpty() || selectedSlotId.isEmpty()) {
            Toast.makeText(this, "Missing update parameters", Toast.LENGTH_SHORT).show()
            return
        }

        thread {
            try {
                val url = URL("$baseUrl/reservations/$reservationId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "PUT"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doOutput = true

                // Build DTO JSON payload for update
                val jsonBody = JSONObject().apply {
                    put("slotId", selectedSlotId)
                    put("scheduledDate", selectedDateString)
                    put("scheduledStartTime", selectedStartTime)
                    put("scheduledEndTime", selectedEndTime)
                }

                OutputStreamWriter(connection.outputStream).use { it.write(jsonBody.toString()) }

                val code = connection.responseCode
                if (code == HttpURLConnection.HTTP_NO_CONTENT || code == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, "Reservation Updated Successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
                    // Parse clean error message from backend error stream
                    val rawError = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Update Failed"
                    val cleanMessage = try {
                        val errJson = JSONObject(rawError)
                        when {
                            errJson.has("error") -> errJson.getString("error")
                            errJson.has("message") -> errJson.getString("message")
                            else -> rawError
                        }
                    } catch (e: Exception) {
                        rawError
                    }

                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, cleanMessage, Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { Toast.makeText(this@UpdateReservationActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }

    private fun cancelReservation() {
        // Validate cancellation reason input
        val reason = etCancelReason.text.toString().trim()
        if (reservationId.isEmpty() || reason.isEmpty()) {
            Toast.makeText(this, "Cancellation reason is required", Toast.LENGTH_SHORT).show()
            return
        }

        thread {
            try {
                val url = URL("$baseUrl/reservations/$reservationId/cancel")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "PATCH"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doOutput = true

                val jsonReason = JSONObject.quote(reason)
                OutputStreamWriter(connection.outputStream).use { it.write(jsonReason) }

                val code = connection.responseCode
                if (code == HttpURLConnection.HTTP_NO_CONTENT || code == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, "Reservation Cancelled Successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
                    // Parse clean error message from backend error stream
                    val rawError = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Cancellation Failed"
                    val cleanMessage = try {
                        val errJson = JSONObject(rawError)
                        when {
                            errJson.has("error") -> errJson.getString("error")
                            errJson.has("message") -> errJson.getString("message")
                            else -> rawError
                        }
                    } catch (e: Exception) {
                        rawError
                    }

                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, cleanMessage, Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { Toast.makeText(this@UpdateReservationActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }
}