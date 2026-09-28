/*
 * Author: Arshvinth S
 * Purpose: Interactive native activity for updating or cancelling energy reservations with modal station and slot pickers.
 */

package com.example.microhelio

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
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
import java.util.Calendar
import kotlin.concurrent.thread

class UpdateReservationActivity : AppCompatActivity() {

    // UI View References
    private lateinit var cardSelectNode: LinearLayout
    private lateinit var tvSelectedNodeTitle: TextView
    private lateinit var tvSelectedNodeSub: TextView

    private lateinit var cardSelectSlot: LinearLayout
    private lateinit var tvSelectedSlotTitle: TextView
    private lateinit var tvSelectedSlotSub: TextView

    private lateinit var tvSelectedSlotDetails: TextView
    private lateinit var etCancelReason: EditText
    private lateinit var btnUpdateReservation: Button
    private lateinit var btnCancelReservation: Button
    private lateinit var btnBack: ImageView
    private lateinit var etProsumerNic: EditText

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
    private var selectedNodeAvailBatterySlots: Int = 1

    private var slotSelectionDialog: AlertDialog? = null
    private var nodeSelectionDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_update_reservation)

        // Bind layout views
        cardSelectNode = findViewById(R.id.cardSelectNode)
        tvSelectedNodeTitle = findViewById(R.id.tvSelectedNodeTitle)
        tvSelectedNodeSub = findViewById(R.id.tvSelectedNodeSub)

        cardSelectSlot = findViewById(R.id.cardSelectSlot)
        tvSelectedSlotTitle = findViewById(R.id.tvSelectedSlotTitle)
        tvSelectedSlotSub = findViewById(R.id.tvSelectedSlotSub)

        tvSelectedSlotDetails = findViewById(R.id.tvSelectedSlotDetails)
        etCancelReason = findViewById(R.id.etCancelReason)
        btnUpdateReservation = findViewById(R.id.btnUpdateReservation)
        btnCancelReservation = findViewById(R.id.btnCancelReservation)
        btnBack = findViewById(R.id.btnBack)
        etProsumerNic = findViewById(R.id.etProsumerNic)

        // Populate session NIC
        val sess = SessionManager(this).getSession()
        etProsumerNic.setText(sess?.accountIdentifier ?: "")

        // Handle back button click
        btnBack.setOnClickListener {
            finish()
        }

        // Get reservation ID passed from history list click
        reservationId = intent.getStringExtra("RESERVATION_ID") ?: ""

        if (reservationId.isNotEmpty()) {
            fetchReservationDetails(reservationId)
        } else {
            Toast.makeText(this, "Error: Invalid Reservation ID", Toast.LENGTH_SHORT).show()
        }

        // Card click listener for Station selection
        cardSelectNode.setOnClickListener {
            if (nodeList.isNotEmpty()) {
                showNodeSelectionDialog()
            } else {
                Toast.makeText(this, "Loading stations... Please try again in a moment.", Toast.LENGTH_SHORT).show()
            }
        }

        // Card click listener for Time Slot selection modal window
        cardSelectSlot.setOnClickListener {
            if (selectedNodeId.isEmpty()) {
                Toast.makeText(this, "Please select a Microgrid Station first.", Toast.LENGTH_SHORT).show()
            } else {
                showSlotSelectionDialog()
            }
        }

        // Action button listeners
        btnUpdateReservation.setOnClickListener { updateReservation() }
        btnCancelReservation.setOnClickListener { cancelReservation() }

        // Setup bottom navigation
        setupBottomNav()
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

    private fun fetchReservationDetails(id: String) {
        thread {
            try {
                var url = URL("$baseUrl/reservations/$id")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 3000
                connection.readTimeout = 3000

                var code = try { connection.responseCode } catch (e: Exception) { -1 }
                if (code != 200) {
                    url = URL("http://10.0.2.2:5056/api/reservations/$id")
                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 3000
                    connection.readTimeout = 3000
                    code = connection.responseCode
                }

                if (code == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)

                    existingNodeId = json.optString("nodeId")
                    existingSlotId = json.optString("slotId")
                    selectedNodeId = existingNodeId
                    selectedSlotId = existingSlotId

                    selectedDateString = json.optString("scheduledDate")
                    selectedStartTime = json.optString("scheduledStartTime")
                    selectedEndTime = json.optString("scheduledEndTime")

                    val dateDisplay = if (selectedDateString.contains("T")) selectedDateString.split("T")[0] else selectedDateString
                    val reqCap = json.optDouble("requestedCapacityKWh", 0.0)

                    runOnUiThread {
                        tvSelectedSlotTitle.text = "$selectedStartTime - $selectedEndTime"
                        tvSelectedSlotSub.text = "Date: $dateDisplay"
                        tvSelectedSlotDetails.text = "Date: $dateDisplay | Time: $selectedStartTime - $selectedEndTime | Requested: $reqCap kWh"
                        cardSelectSlot.setBackgroundResource(R.drawable.bg_card_selector_active)
                    }

                    // Fetch station nodes list after retrieving booking info
                    fetchMicrogridNodes()
                }
            } catch (e: Exception) {
                e.printStackTrace()
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
                    url = URL("http://10.0.2.2:5056/api/nodes")
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
                            val activeNode = nodeList.find { it.optString("id", it.optString("_id")) == selectedNodeId }
                            if (activeNode != null) {
                                selectNode(activeNode, fetchSlots = true)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    if (selectedNodeId.isNotEmpty()) {
                        fetchSlotsForNode(selectedNodeId)
                    }
                }
            }
        }
    }

    private fun showNodeSelectionDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_select_node, null)
        val rvDialogNodes = dialogView.findViewById<RecyclerView>(R.id.rvDialogNodes)
        val btnCloseNodeDialog = dialogView.findViewById<ImageButton>(R.id.btnCloseNodeDialog)

        rvDialogNodes.layoutManager = LinearLayoutManager(this)
        rvDialogNodes.adapter = NodePickerAdapter(nodeList) { selectedNodeObj ->
            selectNode(selectedNodeObj, fetchSlots = true)
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

    private fun selectNode(nodeObj: JSONObject, fetchSlots: Boolean) {
        selectedNodeId = nodeObj.optString("id", nodeObj.optString("_id"))
        selectedNodeAvailBatterySlots = nodeObj.optInt("availableBatterySlots", nodeObj.optInt("AvailableBatterySlots", 1))

        val code = nodeObj.optString("nodeCode", nodeObj.optString("NodeCode", "Node"))
        val name = nodeObj.optString("name", nodeObj.optString("Name", "Microgrid Station"))
        val address = nodeObj.optString("address", nodeObj.optString("Address", ""))

        tvSelectedNodeTitle.text = "$code - $name"
        tvSelectedNodeSub.text = if (address.isNotEmpty()) "Location: $address" else "Station selected"
        cardSelectNode.setBackgroundResource(R.drawable.bg_card_selector_active)

        if (fetchSlots) {
            fetchSlotsForNode(selectedNodeId)
        }
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
                    url = URL("http://10.0.2.2:5056/api/slots?nodeId=$nodeId")
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
                btnFilterPickDate.text = "Select Date ($selectedDate)"
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

        val dateDisplay = if (selectedDateString.contains("T")) selectedDateString.split("T")[0] else selectedDateString
        val availCap = slotObj.optDouble("availableCapacityKWh", slotObj.optDouble("AvailableCapacityKWh", 0.0))

        tvSelectedSlotTitle.text = "$selectedStartTime - $selectedEndTime"
        tvSelectedSlotSub.text = "Date: $dateDisplay | Capacity: $availCap kWh"
        tvSelectedSlotDetails.text = "New Selection: Date: $dateDisplay | Time: $selectedStartTime - $selectedEndTime"
        cardSelectSlot.setBackgroundResource(R.drawable.bg_card_selector_active)
    }

    private fun updateReservation() {
        if (reservationId.isEmpty() || selectedSlotId.isEmpty()) {
            Toast.makeText(this, "Please select a valid time slot to update", Toast.LENGTH_SHORT).show()
            return
        }

        thread {
            try {
                var url = URL("$baseUrl/reservations/$reservationId")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "PUT"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 4000
                connection.readTimeout = 4000
                connection.doOutput = true

                val jsonBody = JSONObject().apply {
                    put("slotId", selectedSlotId)
                    put("scheduledDate", selectedDateString)
                    put("scheduledStartTime", selectedStartTime)
                    put("scheduledEndTime", selectedEndTime)
                }

                OutputStreamWriter(connection.outputStream).use { it.write(jsonBody.toString()) }

                var code = try { connection.responseCode } catch (e: Exception) { -1 }

                if (code == HttpURLConnection.HTTP_NO_CONTENT || code == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, "Reservation Updated Successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
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
        val reason = etCancelReason.text.toString().trim()
        if (reservationId.isEmpty()) {
            Toast.makeText(this, "Invalid reservation record", Toast.LENGTH_SHORT).show()
            return
        }

        if (reason.isEmpty()) {
            Toast.makeText(this, "Cancellation reason is required to proceed", Toast.LENGTH_SHORT).show()
            etCancelReason.error = "Reason is required"
            return
        }

        thread {
            try {
                var url = URL("$baseUrl/reservations/$reservationId/cancel")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "PATCH"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 4000
                connection.readTimeout = 4000
                connection.doOutput = true

                val jsonReason = JSONObject.quote(reason)
                OutputStreamWriter(connection.outputStream).use { it.write(jsonReason) }

                var code = try { connection.responseCode } catch (e: Exception) { -1 }

                if (code == HttpURLConnection.HTTP_NO_CONTENT || code == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this@UpdateReservationActivity, "Reservation Cancelled Successfully!", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                } else {
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