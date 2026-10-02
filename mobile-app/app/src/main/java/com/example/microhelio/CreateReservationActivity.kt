/*
 * Author: Arshvinth S
 * Purpose: Native Android activity for creating reservations with interactive node and slot selector modal windows with green (available) and red (reserved) badges.
 */
package com.example.microhelio

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import java.util.Calendar
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class CreateReservationActivity : AppCompatActivity() {

    // UI elements
    private lateinit var cardSelectNode: LinearLayout
    private lateinit var tvSelectedNodeTitle: TextView
    private lateinit var tvSelectedNodeSub: TextView

    private lateinit var cardSelectSlot: LinearLayout
    private lateinit var tvSelectedSlotTitle: TextView
    private lateinit var tvSelectedSlotSub: TextView

    private lateinit var btnTypeDropOff: Button
    private lateinit var btnTypeCharging: Button

    private lateinit var tvSelectedSlotDetails: TextView
    private lateinit var etCapacity: EditText
    private lateinit var btnSubmitReservation: Button
    private lateinit var etProsumerNic: EditText

    private val baseUrl = com.example.microhelio.api.ApiConfig.getApiBaseUrl()

    // Data lists
    private val nodeList = ArrayList<JSONObject>()
    private val slotList = ArrayList<JSONObject>()

    private var selectedNodeId: String = ""
    private var selectedSlotId: String = ""
    private var selectedDateString: String = ""
    private var selectedStartTime: String = ""
    private var selectedEndTime: String = ""
    private var selectedReservationType: String = "DropOff"
    private var maxAvailableCapacity: Double = 0.0
    private var selectedNodeAvailBatterySlots: Int = 1

    private var slotSelectionDialog: AlertDialog? = null
    private var nodeSelectionDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_reservation)

        // Bind layout views
        cardSelectNode = findViewById(R.id.cardSelectNode)
        tvSelectedNodeTitle = findViewById(R.id.tvSelectedNodeTitle)
        tvSelectedNodeSub = findViewById(R.id.tvSelectedNodeSub)

        cardSelectSlot = findViewById(R.id.cardSelectSlot)
        tvSelectedSlotTitle = findViewById(R.id.tvSelectedSlotTitle)
        tvSelectedSlotSub = findViewById(R.id.tvSelectedSlotSub)

        btnTypeDropOff = findViewById(R.id.btnTypeDropOff)
        btnTypeCharging = findViewById(R.id.btnTypeCharging)

        tvSelectedSlotDetails = findViewById(R.id.tvSelectedSlotDetails)
        etCapacity = findViewById(R.id.etCapacity)
        btnSubmitReservation = findViewById(R.id.btnSubmitReservation)
        etProsumerNic = findViewById(R.id.etProsumerNic)

        // Load logged in prosumer NIC from session
        val sess = SessionManager(this).getSession()
        etProsumerNic.setText(sess?.accountIdentifier ?: "")

        // Handle back button click
        findViewById<ImageView>(R.id.btnBack).setOnClickListener {
            finish()
        }

        // Setup reservation type segmented buttons (DropOff / Charging)
        setupReservationTypeToggle()

        // Card click listener for Node selection
        cardSelectNode.setOnClickListener {
            if (nodeList.isNotEmpty()) {
                showNodeSelectionDialog()
            } else {
                Toast.makeText(this, "Loading stations... Please try again in a moment.", Toast.LENGTH_SHORT).show()
            }
        }

        // Card click listener for Slot selection modal window
        cardSelectSlot.setOnClickListener {
            if (selectedNodeId.isEmpty()) {
                Toast.makeText(this, "Please select a Microgrid Station first.", Toast.LENGTH_SHORT).show()
            } else {
                showSlotSelectionDialog()
            }
        }

        // Fetch nodes from backend API
        fetchMicrogridNodes()

        // Check if intent extras passed target node or slot
        parseIntentExtras()

        // Submit reservation button press
        btnSubmitReservation.setOnClickListener { validateAndSubmit() }

        // Initialize bottom navigation
        setupBottomNav()
    }

    private fun parseIntentExtras() {
        val intentNodeId = intent.getStringExtra("SELECTED_NODE_ID")
        val intentSlotId = intent.getStringExtra("SELECTED_SLOT_ID")
        val intentSlotDate = intent.getStringExtra("SELECTED_SLOT_DATE")
        val intentStartTime = intent.getStringExtra("SELECTED_START_TIME")
        val intentEndTime = intent.getStringExtra("SELECTED_END_TIME")
        val intentMaxCap = intent.getDoubleExtra("MAX_CAPACITY", 0.0)
        val intentSlotType = intent.getStringExtra("SLOT_TYPE")

        if (!intentNodeId.isNullOrEmpty()) {
            selectedNodeId = intentNodeId
        }

        if (!intentSlotId.isNullOrEmpty()) {
            selectedSlotId = intentSlotId
            selectedDateString = intentSlotDate ?: ""
            selectedStartTime = intentStartTime ?: ""
            selectedEndTime = intentEndTime ?: ""
            maxAvailableCapacity = intentMaxCap

            if (!intentSlotType.isNullOrEmpty()) {
                selectReservationType(intentSlotType)
            }

            tvSelectedSlotTitle.text = "$selectedStartTime - $selectedEndTime"
            tvSelectedSlotSub.text = "Date: ${selectedDateString.split("T")[0]} | Max: $maxAvailableCapacity kWh"
            tvSelectedSlotDetails.text = "Date: ${selectedDateString.split("T")[0]} | Time: $selectedStartTime - $selectedEndTime | Limit: $maxAvailableCapacity kWh"
            cardSelectSlot.setBackgroundResource(R.drawable.bg_card_selector_active)
        }
    }

    private fun setupReservationTypeToggle() {
        btnTypeDropOff.setOnClickListener {
            selectReservationType("DropOff")
        }

        btnTypeCharging.setOnClickListener {
            selectReservationType("Charging")
        }
    }

    private fun selectReservationType(type: String) {
        selectedReservationType = type
        if (type.equals("DropOff", ignoreCase = true)) {
            btnTypeDropOff.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#2D6A4F")))
            btnTypeDropOff.setTextColor(Color.WHITE)

            btnTypeCharging.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#F7FAF7")))
            btnTypeCharging.setTextColor(Color.parseColor("#1B2621"))
        } else {
            btnTypeCharging.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#2D6A4F")))
            btnTypeCharging.setTextColor(Color.WHITE)

            btnTypeDropOff.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#F7FAF7")))
            btnTypeDropOff.setTextColor(Color.parseColor("#1B2621"))
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

    private fun fetchMicrogridNodes() {
        thread {
            try {
                var url = URL("$baseUrl/nodes")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 3000
                connection.readTimeout = 3000

                var code = try { connection.responseCode } catch (e: Exception) { -1 }
                if (code != 200) {
                    url = URL("$baseUrl/nodes")
                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 3000
                    connection.readTimeout = 3000
                    code = connection.responseCode
                }

                if (code == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(response)
                    nodeList.clear()

                    for (i in 0 until jsonArray.length()) {
                        nodeList.add(jsonArray.getJSONObject(i))
                    }

                    runOnUiThread {
                        if (selectedNodeId.isNotEmpty()) {
                            // Find pre-selected node
                            val preNode = nodeList.find { it.optString("id", it.optString("_id")) == selectedNodeId }
                            if (preNode != null) {
                                selectNode(preNode)
                            } else if (nodeList.isNotEmpty()) {
                                selectNode(nodeList[0])
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun showNodeSelectionDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_select_node, null)
        val rvDialogNodes = dialogView.findViewById<RecyclerView>(R.id.rvDialogNodes)
        val btnCloseNodeDialog = dialogView.findViewById<ImageButton>(R.id.btnCloseNodeDialog)

        rvDialogNodes.layoutManager = LinearLayoutManager(this)
        rvDialogNodes.adapter = NodePickerAdapter(nodeList) { selectedNodeObj ->
            selectNode(selectedNodeObj)
            nodeSelectionDialog?.dismiss()
        }

        val builder = AlertDialog.Builder(this)
        builder.setView(dialogView)
        nodeSelectionDialog = builder.create()
        nodeSelectionDialog?.window?.setBackgroundDrawableResource(android.R.color.transparent)

        btnCloseNodeDialog.setOnClickListener {
            nodeSelectionDialog?.dismiss()
        }

        nodeSelectionDialog?.show()
    }

    private fun selectNode(nodeObj: JSONObject) {
        selectedNodeId = nodeObj.optString("id", nodeObj.optString("_id"))
        selectedNodeAvailBatterySlots = nodeObj.optInt("availableBatterySlots", nodeObj.optInt("AvailableBatterySlots", 1))

        val code = nodeObj.optString("nodeCode", nodeObj.optString("NodeCode", "Node"))
        val name = nodeObj.optString("name", nodeObj.optString("Name", "Microgrid Station"))
        val address = nodeObj.optString("address", nodeObj.optString("Address", ""))

        tvSelectedNodeTitle.text = "$code - $name"
        tvSelectedNodeSub.text = if (address.isNotEmpty()) "Location: $address ($selectedNodeAvailBatterySlots battery slots available)" else "Station selected"
        cardSelectNode.setBackgroundResource(R.drawable.bg_card_selector_active)

        // Reset previous slot selection when node changes
        selectedSlotId = ""
        tvSelectedSlotTitle.text = "Tap to Choose Time Slot"
        tvSelectedSlotSub.text = "View available & reserved slots"
        tvSelectedSlotDetails.text = "No slot selected yet"
        cardSelectSlot.setBackgroundResource(R.drawable.bg_card_selector)

        // Fetch slots for chosen station
        fetchSlotsForNode(selectedNodeId)
    }

    private fun fetchSlotsForNode(nodeId: String) {
        thread {
            try {
                var url = URL("$baseUrl/slots?nodeId=$nodeId")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 3000
                connection.readTimeout = 3000

                var code = try { connection.responseCode } catch (e: Exception) { -1 }
                if (code != 200) {
                    url = URL("$baseUrl/slots?nodeId=$nodeId")
                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 3000
                    connection.readTimeout = 3000
                    code = connection.responseCode
                }

                if (code == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(response)
                    slotList.clear()

                    for (i in 0 until jsonArray.length()) {
                        slotList.add(jsonArray.getJSONObject(i))
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // Modal Window to select Time Slot displaying Green (Available) and Red (Reserved) marks with Date Filter options
    private fun showSlotSelectionDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_select_slot, null)
        val rvDialogSlots = dialogView.findViewById<RecyclerView>(R.id.rvDialogSlots)
        val btnCloseDialog = dialogView.findViewById<ImageButton>(R.id.btnCloseDialog)
        val tvDialogSubtitle = dialogView.findViewById<TextView>(R.id.tvDialogSubtitle)
        val layoutEmptySlots = dialogView.findViewById<LinearLayout>(R.id.layoutEmptySlots)

        val btnFilterAllDates = dialogView.findViewById<Button>(R.id.btnFilterAllDates)
        val btnFilterFutureDates = dialogView.findViewById<Button>(R.id.btnFilterFutureDates)
        val btnFilterPickDate = dialogView.findViewById<Button>(R.id.btnFilterPickDate)

        tvDialogSubtitle.text = "Station: ${tvSelectedNodeTitle.text}"

        val adapter = SlotPickerAdapter(slotList) { chosenSlotObj ->
            selectSlot(chosenSlotObj)
            slotSelectionDialog?.dismiss()
        }

        rvDialogSlots.layoutManager = LinearLayoutManager(this)
        rvDialogSlots.adapter = adapter

        fun updateVisibility(count: Int) {
            if (count == 0) {
                rvDialogSlots.visibility = View.GONE
                layoutEmptySlots.visibility = View.VISIBLE
            } else {
                rvDialogSlots.visibility = View.VISIBLE
                layoutEmptySlots.visibility = View.GONE
            }
        }

        fun setFilterHighlight(selectedBtn: Button) {
            val activeBg = ColorStateList.valueOf(Color.parseColor("#2D6A4F"))
            val inactiveBg = ColorStateList.valueOf(Color.parseColor("#F7FAF7"))
            val darkText = Color.parseColor("#1B2621")

            btnFilterAllDates.setBackgroundTintList(inactiveBg)
            btnFilterAllDates.setTextColor(darkText)

            btnFilterFutureDates.setBackgroundTintList(inactiveBg)
            btnFilterFutureDates.setTextColor(darkText)

            btnFilterPickDate.setBackgroundTintList(inactiveBg)
            btnFilterPickDate.setTextColor(darkText)

            selectedBtn.setBackgroundTintList(activeBg)
            selectedBtn.setTextColor(Color.WHITE)
        }

        if (slotList.isEmpty()) {
            updateVisibility(0)
        } else {
            updateVisibility(slotList.size)
        }

        btnFilterAllDates.setOnClickListener {
            setFilterHighlight(btnFilterAllDates)
            val count = adapter.filterAll()
            updateVisibility(count)
        }

        btnFilterFutureDates.setOnClickListener {
            setFilterHighlight(btnFilterFutureDates)
            val count = adapter.filterFutureDatesFromToday()
            updateVisibility(count)
        }

        btnFilterPickDate.setOnClickListener {
            val calendar = Calendar.getInstance()
            DatePickerDialog(this, { _, year, month, dayOfMonth ->
                val selectedDate = String.format("%d-%02d-%02d", year, month + 1, dayOfMonth)
                btnFilterPickDate.text = "📅 $selectedDate"
                setFilterHighlight(btnFilterPickDate)
                val count = adapter.filterBySpecificDate(selectedDate)
                updateVisibility(count)
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show()
        }

        val builder = AlertDialog.Builder(this)
        builder.setView(dialogView)
        slotSelectionDialog = builder.create()
        slotSelectionDialog?.window?.setBackgroundDrawableResource(android.R.color.transparent)

        btnCloseDialog.setOnClickListener {
            slotSelectionDialog?.dismiss()
        }

        slotSelectionDialog?.show()
    }

    private fun selectSlot(slotObj: JSONObject) {
        selectedSlotId = slotObj.optString("id", slotObj.optString("_id"))
        selectedDateString = slotObj.optString("slotDate", slotObj.optString("SlotDate"))
        selectedStartTime = slotObj.optString("slotStartTime", slotObj.optString("SlotStartTime"))
        selectedEndTime = slotObj.optString("slotEndTime", slotObj.optString("SlotEndTime"))
        maxAvailableCapacity = slotObj.optDouble("availableCapacityKWh", slotObj.optDouble("AvailableCapacityKWh", 0.0))

        val dateDisplay = if (selectedDateString.contains("T")) selectedDateString.split("T")[0] else selectedDateString

        tvSelectedSlotTitle.text = "$selectedStartTime - $selectedEndTime"
        tvSelectedSlotSub.text = "Date: $dateDisplay | Capacity: $maxAvailableCapacity kWh available"
        tvSelectedSlotDetails.text = "Date: $dateDisplay | Time: $selectedStartTime - $selectedEndTime | Available Limit: $maxAvailableCapacity kWh"
        cardSelectSlot.setBackgroundResource(R.drawable.bg_card_selector_active)

        // Suggest capacity in input box if currently empty
        if (etCapacity.text.toString().trim().isEmpty() && maxAvailableCapacity > 0.0) {
            etCapacity.setText(maxAvailableCapacity.toString())
        }
    }

    private fun validateAndSubmit() {
        if (selectedNodeAvailBatterySlots <= 0) {
            Toast.makeText(this, "No physical battery slots available at this station.", Toast.LENGTH_LONG).show()
            return
        }

        if (selectedNodeId.isEmpty()) {
            Toast.makeText(this, "Please select a Microgrid Station", Toast.LENGTH_SHORT).show()
            return
        }

        if (selectedSlotId.isEmpty()) {
            Toast.makeText(this, "Please click and select an available Time Slot", Toast.LENGTH_SHORT).show()
            return
        }

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

        if (capacity > maxAvailableCapacity) {
            Toast.makeText(this, "Requested capacity exceeds available slot limit ($maxAvailableCapacity kWh)", Toast.LENGTH_LONG).show()
            etCapacity.error = "Exceeds available limit ($maxAvailableCapacity kWh)"
            return
        }

        submitReservationToApi(capacity)
    }

    private fun submitReservationToApi(capacity: Double) {
        thread {
            try {
                var url = URL("$baseUrl/reservations")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 4000
                connection.readTimeout = 4000
                connection.doOutput = true

                val session = SessionManager(this).getSession()
                val nic = session?.accountIdentifier ?: etProsumerNic.text.toString().trim()

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

                var code = try { connection.responseCode } catch (e: Exception) { -1 }

                if (code == HttpURLConnection.HTTP_CREATED || code == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this@CreateReservationActivity, "Reservation Created Successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
                    val rawError = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown Error"
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