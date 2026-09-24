/*
 * Author: Arshvinth S
 * Purpose: Native Android activity for viewing and searching reservation history with dropdown status and date picker filters.
 */

package com.example.microhelio

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import kotlin.concurrent.thread

class BookingHistoryActivity : AppCompatActivity() {

    // UI filters and list components
    private lateinit var spinnerFilterStatus: Spinner
    private lateinit var etFilterDate: EditText
    private lateinit var btnSearch: Button
    private lateinit var rvHistoryList: RecyclerView

    private val baseUrl = "http://localhost:5056/api"
    private val prosumerNic = "981234567V"

    private val statusOptions = arrayOf("All Statuses", "Pending", "Approved", "Cancelled")
    private var selectedStatusFilter: String? = null
    private var selectedDateFilter: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_booking_history)

        // Bind layout views
        spinnerFilterStatus = findViewById(R.id.spinnerFilterStatus)
        etFilterDate = findViewById(R.id.etFilterDate)
        btnSearch = findViewById(R.id.btnSearch)
        rvHistoryList = findViewById(R.id.rvHistoryList)
        rvHistoryList.layoutManager = LinearLayoutManager(this)

        // Setup status dropdown spinner
        setupStatusSpinner()

        // Setup date picker dialog when date field is clicked
        setupDatePicker()

        // Load all bookings initially
        fetchReservations(null, null)

        // Handle search filter button clicks
        btnSearch.setOnClickListener {
            fetchReservations(selectedStatusFilter, selectedDateFilter)
        }

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


    private fun setupStatusSpinner() {
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, statusOptions)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerFilterStatus.adapter = adapter

        spinnerFilterStatus.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, position: Int, id: Long) {
                selectedStatusFilter = if (position == 0) null else statusOptions[position]
            }
            override fun onNothingSelected(parent: AdapterView<*>) {
                selectedStatusFilter = null
            }
        }
    }

    private fun setupDatePicker() {
        etFilterDate.isFocusable = false
        etFilterDate.isClickable = true

        etFilterDate.setOnClickListener {
            val calendar = Calendar.getInstance()
            DatePickerDialog(this, { _, y, m, d ->
                val formattedDate = String.format("%d-%02d-%02d", y, m + 1, d)
                etFilterDate.setText(formattedDate)
                selectedDateFilter = formattedDate
            }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show()
        }
    }

    private fun fetchReservations(status: String?, date: String?) {
        // Query server for bookings using background thread
        thread {
            try {
                val urlString = java.lang.StringBuilder("$baseUrl/reservations/search?nic=$prosumerNic")
                if (!status.isNullOrEmpty()) urlString.append("&status=$status")
                if (!date.isNullOrEmpty()) urlString.append("&date=$date")

                val url = URL(urlString.toString())
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                val code = connection.responseCode
                if (code == 200) {
                    val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(responseString)
                    val list = ArrayList<JSONObject>()

                    // Parse JSON array into list objects
                    for (i in 0 until jsonArray.length()) {
                        list.add(jsonArray.getJSONObject(i))
                    }

                    // Update UI list adapter on main thread
                    runOnUiThread {
                        rvHistoryList.adapter = ReservationAdapter(list)
                        if (list.isEmpty()) {
                            Toast.makeText(this@BookingHistoryActivity, "No bookings found", Toast.LENGTH_SHORT).show()
                        }
                    }
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown Error"
                    runOnUiThread { Toast.makeText(this@BookingHistoryActivity, "Search Failed ($code): $errorStream", Toast.LENGTH_LONG).show() }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { Toast.makeText(this@BookingHistoryActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show() }
            }
        }
    }
}