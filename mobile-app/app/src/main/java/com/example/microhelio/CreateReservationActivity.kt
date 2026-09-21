/*
 * Author: Ashwin
 * Purpose: Native Android activity for creating energy reservations with API integration.
 */
package com.example.microhelio

import android.app.DatePickerDialog
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import kotlin.concurrent.thread

class CreateReservationActivity : AppCompatActivity() {

    private lateinit var etNodeId: EditText
    private lateinit var etSlotId: EditText
    private lateinit var etReservationType: EditText
    private lateinit var btnSelectDate: Button
    private lateinit var etStartTime: EditText
    private lateinit var etEndTime: EditText
    private lateinit var etCapacity: EditText
    private lateinit var btnSubmitReservation: Button

    private var selectedDateString: String = ""
    private val baseUrl = "https://10.0.2.2:5056/api"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_create_reservation)

        etNodeId = findViewById(R.id.etNodeId)
        etSlotId = findViewById(R.id.etSlotId)
        etReservationType = findViewById(R.id.etReservationType)
        btnSelectDate = findViewById(R.id.btnSelectDate)
        etStartTime = findViewById(R.id.etStartTime)
        etEndTime = findViewById(R.id.etEndTime)
        etCapacity = findViewById(R.id.etCapacity)
        btnSubmitReservation = findViewById(R.id.btnSubmitReservation)

        // Date Picker Dialog with 7-day rule constraint awareness
        btnSelectDate.setOnClickListener {
            val calendar = Calendar.getInstance()
            val year = calendar.get(Calendar.YEAR)
            val month = calendar.get(Calendar.MONTH)
            val day = calendar.get(Calendar.DAY_OF_MONTH)

            val datePicker = DatePickerDialog(this, { _, y, m, d ->
                selectedDateString = String.format("%d-%02d-%02dT00:00:00Z", y, m + 1, d)
                btnSelectDate.text = String.format("%d-%02d-%02d", y, m + 1, d)
            }, year, month, day)

            // Optional: Limit picker date range to next 7 days
            datePicker.datePicker.minDate = calendar.timeInMillis
            calendar.add(Calendar.DAY_OF_YEAR, 7)
            datePicker.datePicker.maxDate = calendar.timeInMillis

            datePicker.show()
        }

        btnSubmitReservation.setOnClickListener {
            submitReservationToApi()
        }
    }

    private fun submitReservationToApi() {
        val nodeId = etNodeId.text.toString().trim()
        val slotId = etSlotId.text.toString().trim()
        val type = etReservationType.text.toString().trim()
        val startTime = etStartTime.text.toString().trim()
        val endTime = etEndTime.text.toString().trim()
        val capacityStr = etCapacity.text.toString().trim()
        val prosumerNic = "981234567V" // Stored session NIC

        if (nodeId.isEmpty() || slotId.isEmpty() || selectedDateString.isEmpty() || startTime.isEmpty() || capacityStr.isEmpty()) {
            Toast.makeText(this, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
            return
        }

        val capacity = capacityStr.toDoubleOrNull() ?: 0.0

        thread {
            try {
                val url = URL("$baseUrl/reservations")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.setRequestProperty("Accept", "application/json")
                connection.doOutput = true

                val jsonBody = JSONObject().apply {
                    put("prosumerNic", prosumerNic)
                    put("nodeId", nodeId)
                    put("slotId", slotId)
                    put("reservationType", type)
                    put("scheduledDate", selectedDateString)
                    put("scheduledStartTime", startTime)
                    put("scheduledEndTime", endTime)
                    put("requestedCapacityKWh", capacity)
                }

                OutputStreamWriter(connection.outputStream).use { it.write(jsonBody.toString()) }

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_CREATED || responseCode == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this, "Reservation created successfully!", Toast.LENGTH_LONG).show()
                        finish() // Return to Dashboard
                    }
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                    runOnUiThread {
                        Toast.makeText(this, "Error: ${errorStream ?: "Failed to create reservation"}handler", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this, "Network error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}