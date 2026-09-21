/*
 * Author: Ashwin
 * Purpose: Native Android activity for updating or cancelling reservations with API sync.
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

class UpdateReservationActivity : AppCompatActivity() {

    private lateinit var etReservationId: EditText
    private lateinit var etNewSlotId: EditText
    private lateinit var btnSelectNewDate: Button
    private lateinit var etNewStartTime: EditText
    private lateinit var etNewEndTime: EditText
    private lateinit var etCancelReason: EditText
    private lateinit var btnUpdateReservation: Button
    private lateinit var btnCancelReservation: Button

    private var selectedDateString: String = ""
    private val baseUrl = "https://10.0.2.2:5056/api"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_update_reservation)

        etReservationId = findViewById(R.id.etReservationId)
        etNewSlotId = findViewById(R.id.etNewSlotId)
        btnSelectNewDate = findViewById(R.id.btnSelectNewDate)
        etNewStartTime = findViewById(R.id.etNewStartTime)
        etNewEndTime = findViewById(R.id.etNewEndTime)
        etCancelReason = findViewById(R.id.etCancelReason)
        btnUpdateReservation = findViewById(R.id.btnUpdateReservation)
        btnCancelReservation = findViewById(R.id.btnCancelReservation)

        // Pre-fill reservation ID if passed via intent
        intent.getStringExtra("RESERVATION_ID")?.let {
            etReservationId.setText(it)
        }

        btnSelectNewDate.setOnClickListener {
            val calendar = Calendar.getInstance()
            val year = calendar.get(Calendar.YEAR)
            val month = calendar.get(Calendar.MONTH)
            val day = calendar.get(Calendar.DAY_OF_MONTH)

            DatePickerDialog(this, { _, y, m, d ->
                selectedDateString = String.format("%d-%02d-%02dT00:00:00Z", y, m + 1, d)
                btnSelectNewDate.text = String.format("%d-%02d-%02d", y, m + 1, d)
            }, year, month, day).show()
        }

        btnUpdateReservation.setOnClickListener {
            updateReservation()
        }

        btnCancelReservation.setOnClickListener {
            cancelReservation()
        }
    }

    private fun updateReservation() {
        val reservationId = etReservationId.text.toString().trim()
        val slotId = etNewSlotId.text.toString().trim()
        val startTime = etNewStartTime.text.toString().trim()
        val endTime = etNewEndTime.text.toString().trim()

        if (reservationId.isEmpty() || slotId.isEmpty() || selectedDateString.isEmpty() || startTime.isEmpty()) {
            Toast.makeText(this, "Please fill in all update fields", Toast.LENGTH_SHORT).show()
            return
        }

        thread {
            try {
                val url = URL("$baseUrl/reservations/$reservationId")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "PUT"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.setRequestProperty("Accept", "application/json")
                connection.doOutput = true

                val jsonBody = JSONObject().apply {
                    put("slotId", slotId)
                    put("scheduledDate", selectedDateString)
                    put("scheduledStartTime", startTime)
                    put("scheduledEndTime", endTime)
                }

                OutputStreamWriter(connection.outputStream).use { it.write(jsonBody.toString()) }

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_NO_CONTENT || responseCode == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this, "Reservation updated successfully!", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                    runOnUiThread {
                        Toast.makeText(this, "Update failed: ${errorStream ?: "Check 12-hour notice rule"}handler", Toast.LENGTH_LONG).show()
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

    private fun cancelReservation() {
        val reservationId = etReservationId.text.toString().trim()
        val reason = etCancelReason.text.toString().trim()

        if (reservationId.isEmpty() || reason.isEmpty()) {
            Toast.makeText(this, "Reservation ID and cancellation reason are required", Toast.LENGTH_SHORT).show()
            return
        }

        thread {
            try {
                val url = URL("$baseUrl/reservations/$reservationId/cancel")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "PATCH"
                connection.setRequestProperty("Content-Type", "application/json; utf-8")
                connection.setRequestProperty("Accept", "application/json")
                connection.doOutput = true

                // Passing string reason as JSON body expected by controller
                val jsonBody = JSONObject.quote(reason)

                OutputStreamWriter(connection.outputStream).use { it.write(jsonBody) }

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_NO_CONTENT || responseCode == HttpURLConnection.HTTP_OK) {
                    runOnUiThread {
                        Toast.makeText(this, "Reservation cancelled successfully!", Toast.LENGTH_LONG).show()
                        finish()
                    }
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                    runOnUiThread {
                        Toast.makeText(this, "Cancellation failed: ${errorStream ?: "Check 12-hour rule"}handler", Toast.LENGTH_LONG).show()
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