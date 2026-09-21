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

    private val baseUrl = "https://10.0.2.2:5056/api"
    private val prosumerNic = "981234567V"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_booking_history)

        etFilterStatus = findViewById(R.id.etFilterStatus)
        etFilterDate = findViewById(R.id.etFilterDate)
        btnSearch = findViewById(R.id.btnSearch)
        rvHistoryList = findViewById(R.id.rvHistoryList)

        rvHistoryList.layoutManager = LinearLayoutManager(this)

        // Load initial list for prosumer
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
                // Build dynamic query URL matching backend search endpoint
                val urlString = StringBuilder("$baseUrl/reservations/search?nic=$prosumerNic")
                if (!status.isNullOrEmpty()) urlString.append("&status=$status")
                if (!date.isNullOrEmpty()) urlString.append("&date=$date")

                val url = URL(urlString.toString())
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")

                if (connection.responseCode == 200) {
                    val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(responseString)
                    val list = ArrayList<JSONObject>()

                    for (i in 0 until jsonArray.length()) {
                        list.add(jsonArray.getJSONObject(i))
                    }

                    runOnUiThread {
                        rvHistoryList.adapter = ReservationAdapter(list)
                    }
                } else {
                    runOnUiThread {
                        Toast.makeText(this, "Failed to retrieve history", Toast.LENGTH_SHORT).show()
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