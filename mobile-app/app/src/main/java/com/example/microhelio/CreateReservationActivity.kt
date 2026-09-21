/*
 * Author: Ashwin
 * Purpose: Native Android activity for creating reservations with dropdown inputs and strict capacity validation.
 */
package com.example.microhelio

import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
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

    private lateinit var spinnerNodes: Spinner
    private lateinit var spinnerSlots: Spinner
    private lateinit var spinnerReservationType: Spinner
    private lateinit var tvSelectedSlotDetails: TextView
    private lateinit var etCapacity: EditText
    private lateinit var btnSubmitReservation: Button

    private val baseUrl = "http://localhost:5056/api"

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_reservation)

        spinnerNodes = findViewById(R.id.spinnerNodes)
        spinnerSlots = findViewById(R.id.spinnerSlots)
        spinnerReservationType = findViewById(R.id.spinnerReservationType)
        tvSelectedSlotDetails = findViewById(R.id.tvSelectedSlotDetails)
        etCapacity = findViewById(R.id.etCapacity)
        btnSubmitReservation = findViewById(R.id.btnSubmitReservation)

        setupReservationTypeSpinner()
        fetchMicrogridNodes()

        btnSubmitReservation.setOnClickListener { validateAndSubmit() }
    }

    private fun setupReservationTypeSpinner() {
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
        thread {
            try {
                val url = URL("$baseUrl/nodes")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(response)
                    nodeList.clear()

                    val displayNames = ArrayList<String>()
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        nodeList.add(obj)
                        displayNames.add("${obj.optString("nodeCode")} - ${obj.optString("name")}")
                    }

                    runOnUiThread {
                        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, displayNames)
                        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                        spinnerNodes.adapter = adapter

                        spinnerNodes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
                            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                                val node = nodeList[position]
                                selectedNodeId = node.optString("id", node.optString("_id"))
                                fetchSlotsForNode(selectedNodeId)
                            }
                            override fun onNothingSelected(parent: AdapterView<*>) {}
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    selectedNodeId = "6ab010deebaa40318d55e010"
                    fetchSlotsForNode(selectedNodeId)
                }
            }
        }
    }

    private fun fetchSlotsForNode(nodeId: String) {
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
        if (selectedSlotId.isEmpty() || selectedNodeId.isEmpty()) {
            Toast.makeText(this, "Please select a valid node and slot", Toast.LENGTH_SHORT).show()
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
            etCapacity.error = "Exceeds available limit"
            return
        }

        submitReservationToApi(capacity)
    }

    private fun submitReservationToApi(capacity: Double) {
        thread {
            try {
                val url = URL("$baseUrl/reservations")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doOutput = true

                val jsonBody = JSONObject().apply {
                    put("prosumerNic", "981234567V")
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
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown Error"
                    runOnUiThread { Toast.makeText(this@CreateReservationActivity, "Failed ($code): $errorStream", Toast.LENGTH_LONG).show() }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { Toast.makeText(this@CreateReservationActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }
}