/*
 * Author: Arshvinth S
 * Purpose: Native Android activity for creating reservations with dropdown inputs and strict capacity and time policy validation.
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

class CreateReservationActivity : AppCompatActivity() {

    // UI elements setup
    private lateinit var spinnerNodes: Spinner
    private lateinit var spinnerSlots: Spinner
    private lateinit var spinnerReservationType: Spinner
    private lateinit var tvSelectedSlotDetails: TextView
    private lateinit var etCapacity: EditText
    private lateinit var btnSubmitReservation: Button

    private val baseUrl = com.example.microhelio.api.ApiConfig.getApiBaseUrl()

    // Lists to hold server data for dropdowns
    private val nodeList = ArrayList<JSONObject>()
    private val slotList = ArrayList<JSONObject>()
    private val types = arrayOf("DropOff", "Charging")

    private var selectedNodeId: String = ""
    private var selectedSlotId: String = ""
    private var selectedDateString: String = ""
    private var selectedStartTime: String = ""
    private var selectedEndTime: String = ""
    private var selectedReservationType: String = "DropOff"
    private var maxAvailableCapacity: Double = 0.0
    // Prosumer NIC field (read‑only)
    private lateinit var etProsumerNic: EditText
    private var selectedNodeAvailBatterySlots: Int = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_reservation)

        // Bind views from layout
        spinnerNodes = findViewById(R.id.spinnerNodes)
        spinnerSlots = findViewById(R.id.spinnerSlots)
        spinnerReservationType = findViewById(R.id.spinnerReservationType)
        tvSelectedSlotDetails = findViewById(R.id.tvSelectedSlotDetails)
        etCapacity = findViewById(R.id.etCapacity)
        btnSubmitReservation = findViewById(R.id.btnSubmitReservation)
        // Bind NIC field and populate from session (read‑only)
        etProsumerNic = findViewById(R.id.etProsumerNic)
        val sess = SessionManager(this).getSession()
        etProsumerNic.setText(sess?.accountIdentifier ?: "")

        // Handle professional back icon click to return to previous screen
        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }

        // Initialize type dropdown and load microgrid nodes
        setupReservationTypeSpinner()
        fetchMicrogridNodes()

        // Trigger form validation and submission on button press
        btnSubmitReservation.setOnClickListener { validateAndSubmit() }

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

    private fun setupReservationTypeSpinner() {
        // Populate drop-off or charging options
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, types)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerReservationType.adapter = adapter

        spinnerReservationType.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                selectedReservationType = types[position]
            }
            override fun onNothingSelected(parent: AdapterView<*>) {}
        }
    }

    private fun fetchMicrogridNodes() {
        // Fetch nodes from backend in a background thread
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
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        nodeList.add(obj)

                        // Parse keys supporting both camelCase and PascalCase
                        val nodeName = if (obj.has("name")) obj.optString("name") else obj.optString("Name", "Unknown Node")
                        val nodeAddress = if (obj.has("address")) obj.optString("address") else obj.optString("Address", "")
                        val nodeCode = if (obj.has("nodeCode")) obj.optString("nodeCode") else obj.optString("NodeCode", "")

                        val displayString = if (nodeAddress.isNotEmpty()) {
                            "$nodeCode - $nodeName ($nodeAddress)"
                        } else {
                            "$nodeCode - $nodeName"
                        }
                        displayNames.add(displayString)
                    }

                    // Update UI on main thread
                    runOnUiThread {
                        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, displayNames)
                        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                        spinnerNodes.adapter = adapter

                        spinnerNodes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                                val node = nodeList[position]
                                selectedNodeId = node.optString("id", node.optString("_id"))
                                selectedNodeAvailBatterySlots = node.optInt("availableBatterySlots", node.optInt("AvailableBatterySlots", 1))
                                fetchSlotsForNode(selectedNodeId)
                            }
                            override fun onNothingSelected(parent: AdapterView<*>) {}
                        }
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this@CreateReservationActivity, "Failed to load nodes: HTTP $responseCode", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                // Removed hardcoded fallback ID; notify user of network/connection failure instead
                runOnUiThread {
                    Toast.makeText(this@CreateReservationActivity, "Could not load microgrid nodes. Check backend connection.", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun fetchSlotsForNode(nodeId: String) {
        // Get available slots for the chosen node
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
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        slotList.add(obj)
                        val date = obj.optString("slotDate").split("T")[0]
                        slotDisplays.add("$date | ${obj.optString("slotStartTime")} - ${obj.optString("slotEndTime")} (${obj.optDouble("availableCapacityKWh")} kWh left)")
                    }

                    // Populate slot dropdown
                    runOnUiThread {
                        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, slotDisplays)
                        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                        spinnerSlots.adapter = adapter

                        spinnerSlots.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                                val slot = slotList[position]
                                selectedSlotId = slot.optString("id", slot.optString("_id"))
                                selectedDateString = slot.optString("slotDate")
                                selectedStartTime = slot.optString("slotStartTime")
                                selectedEndTime = slot.optString("slotEndTime")
                                maxAvailableCapacity = slot.optDouble("availableCapacityKWh", 0.0)

                                tvSelectedSlotDetails.text = "Slot: $selectedStartTime - $selectedEndTime (Max: $maxAvailableCapacity kWh)"
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

    private fun validateAndSubmit() {
        // Validate physical battery slot availability for DropOff or Charging
        if (selectedNodeAvailBatterySlots <= 0) {
            Toast.makeText(this, "No battery slots are currently available at this node.", Toast.LENGTH_LONG).show()
            return
        }

        // Check if node and slot are selected
        if (selectedSlotId.isEmpty() || selectedNodeId.isEmpty()) {
            Toast.makeText(this, "Please select a valid node and slot", Toast.LENGTH_SHORT).show()
            return
        }

        // Validate capacity input field
        val capacityText = etCapacity.text.toString().trim()
        if (capacityText.isEmpty()) {
            Toast.makeText(this, "Please enter requested capacity", Toast.LENGTH_SHORT).show()
            etCapacity.error = "Capacity is required"
            return
        }

        val capacity = capacityText.toDoubleOrNull()
        if (capacity == null || capacity <= 0.0) {
            Toast.makeText(this, "Capacity must be greater than zero", Toast.LENGTH_SHORT).show()
            etCapacity.error = "Invalid capacity value"
            return
        }

        // Ensure requested amount doesn't exceed slot limit
        if (capacity > maxAvailableCapacity) {
            Toast.makeText(this, "Requested capacity exceeds available slot limit ($maxAvailableCapacity kWh)", Toast.LENGTH_LONG).show()
            etCapacity.error = "Exceeds available limit"
            return
        }

        submitReservationToApi(capacity)
    }

    private fun submitReservationToApi(capacity: Double) {
        // Send POST request to create reservation
        thread {
            try {
                val url = URL("$baseUrl/reservations")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doOutput = true

                // Build JSON payload
                // Build JSON payload using logged-in user's NIC
                val session = SessionManager(this).getSession()
                val nic = session?.accountIdentifier ?: ""
                val jsonBody = JSONObject().apply {
                    put("prosumerNic", nic)
                    put("nodeId", selectedNodeId)
                    put("slotId", selectedSlotId)
                    put("reservationType", selectedReservationType)
                    put("scheduledDate", selectedDateString)
                    put("scheduledStartTime", selectedStartTime)
                    put("scheduledEndTime", selectedEndTime)
                    put("requestedCapacityKWh", capacity)
                }

                OutputStreamWriter(connection.outputStream).use { it.write(jsonBody.toString()) }

                val code = connection.responseCode
                if (code == HttpURLConnection.HTTP_CREATED || code == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this@CreateReservationActivity, "Reservation Created Successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
                    // Read raw error response stream from backend
                    val rawError = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown Error"

                    // Parse clean error message if returned as JSON (e.g., {"error": "..."} or {"message": "..."})
                    val cleanMessage = try {
                        val errJson = JSONObject(rawError)
                        when {
                            errJson.has("error") -> errJson.getString("error")
                            errJson.has("message") -> errJson.getString("message")
                            else -> rawError
                        }
                    } catch (e: Exception) {
                        rawError // Fallback to raw string if not valid JSON
                    }

                    runOnUiThread {
                        Toast.makeText(this@CreateReservationActivity, cleanMessage, Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { Toast.makeText(this@CreateReservationActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }
}