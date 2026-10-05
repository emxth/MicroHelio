/*
 * Author: Sewwandi S
 * Purpose: Main Component 2 activity displaying the Microgrid Node List with real-time search filtering.
 */

package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
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

class NodeListActivity : AppCompatActivity() {

    private lateinit var etSearchNode: EditText
    private lateinit var rvNodeList: RecyclerView
    private lateinit var adapter: NodeAdapter
    private val nodeList = ArrayList<JSONObject>()

    private val baseUrl = com.example.microhelio.api.ApiConfig.getApiBaseUrl()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_node_list)

        etSearchNode = findViewById(R.id.etSearchNode)
        rvNodeList = findViewById(R.id.rvNodeList)

        rvNodeList.layoutManager = LinearLayoutManager(this)
        adapter = NodeAdapter(nodeList)
        rvNodeList.adapter = adapter

        // Setup real-time search filter listener
        etSearchNode.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                adapter.filter(s.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // Fetch nodes from backend API
        fetchMicrogridNodes()

        // Setup bottom navigation bar
        setupBottomNav()
    }

    override fun onResume() {
        super.onResume()
        fetchMicrogridNodes()
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
        // Query server for microgrid nodes using background thread (same pattern as BookingHistoryActivity)
        thread {
            try {
                // Try localhost first, fallback to emulator 10.0.2.2 if connection fails
                var url = URL("$baseUrl/microgridnodes")
                var connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 3000
                connection.readTimeout = 3000

                var code = try { connection.responseCode } catch (e: Exception) { -1 }

                if (code != 200) {
                    url = URL("$baseUrl/microgridnodes")
                    connection = url.openConnection() as HttpURLConnection
                    connection.requestMethod = "GET"
                    connection.setRequestProperty("Accept", "application/json")
                    connection.connectTimeout = 3000
                    connection.readTimeout = 3000
                    code = connection.responseCode
                }

                if (code == 200) {
                    val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(responseString)
                    val list = ArrayList<JSONObject>()

                    for (i in 0 until jsonArray.length()) {
                        list.add(jsonArray.getJSONObject(i))
                    }

                    // Update UI adapter on main thread
                    runOnUiThread {
                        nodeList.clear()
                        nodeList.addAll(list)
                        adapter = NodeAdapter(nodeList)
                        rvNodeList.adapter = adapter
                        adapter.filter(etSearchNode.text.toString())
                    }
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown Error"
                    runOnUiThread {
                        Toast.makeText(this@NodeListActivity, "API Error ($code): $errorStream", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this@NodeListActivity, "Network Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
