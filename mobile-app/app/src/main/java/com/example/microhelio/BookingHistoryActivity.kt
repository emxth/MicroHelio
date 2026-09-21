/*
 * Author: Ashwin
 * Purpose: Native Android activity for viewing and searching reservation history.
 */

package com.example.microhelio

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class BookingHistoryActivity : AppCompatActivity() {

    private lateinit var etFilterStatus: EditText
    private lateinit var etFilterDate: EditText
    private lateinit var btnSearch: Button
    private lateinit var rvHistoryList: RecyclerView

    private val baseUrl = "http://localhost:5056/api"
    private val prosumerNic = "981234567V"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_booking_history)

        etFilterStatus = findViewById(R.id.etFilterStatus)
        etFilterDate = findViewById(R.id.etFilterDate)
        btnSearch = findViewById(R.id.btnSearch)
        rvHistoryList = findViewById(R.id.rvHistoryList)
        rvHistoryList.layoutManager = LinearLayoutManager(this)

        fetchReservations(null, null)

        btnSearch.setOnClickListener {
            val status = etFilterStatus.text.toString().trim().ifEmpty { null }
            val date = etFilterDate.text.toString().trim().ifEmpty { null }
            fetchReservations(status, date)
        }
    }

    private fun fetchReservations(status: String?, date: String?) {
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

                    for (i in 0 until jsonArray.length()) {
                        list.add(jsonArray.getJSONObject(i))
                    }

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