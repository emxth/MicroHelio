/*
 * Author: Sewwandi S
 * Purpose: RecyclerView adapter for displaying Microgrid Station Nodes with live search filtering.
 */

package com.example.microhelio

import android.content.Intent
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject
import java.util.Locale

class NodeAdapter(private val rawNodeList: List<JSONObject>) :
    RecyclerView.Adapter<NodeAdapter.ViewHolder>() {

    private var filteredNodes: ArrayList<JSONObject> = ArrayList(rawNodeList)

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvNodeCode: TextView = view.findViewById(R.id.tvNodeCode)
        val tvNodeLocation: TextView = view.findViewById(R.id.tvNodeLocation)
        val tvNodeStatus: TextView = view.findViewById(R.id.tvNodeStatus)
        val tvNodeCapacity: TextView = view.findViewById(R.id.tvNodeCapacity)
        val tvNodeBattery: TextView = view.findViewById(R.id.tvNodeBattery)
        val tvNodeSchedule: TextView = view.findViewById(R.id.tvNodeSchedule)
        val btnViewDetails: Button = view.findViewById(R.id.btnViewDetails)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_microgrid_node, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val node = filteredNodes[position]

        val code = node.optString("nodeCode", node.optString("NodeCode", "Node"))
        val name = node.optString("name", node.optString("Name", "Microgrid Station"))
        val address = node.optString("address", node.optString("Address", ""))
        val locationText = if (address.isNotEmpty()) "$name ($address)" else name

        val capacity = node.optDouble("capacityKWh", node.optDouble("CapacityKWh", 0.0))
        val totalSlots = node.optInt("totalBatterySlots", node.optInt("TotalBatterySlots", 0))
        val availSlots = node.optInt("availableBatterySlots", node.optInt("AvailableBatterySlots", 0))

        val openTime = node.optString("openTime", node.optString("OpenTime", "08:00"))
        val closeTime = node.optString("closeTime", node.optString("CloseTime", "18:00"))

        val isActive = node.optBoolean("isActive", node.optBoolean("IsActive", true))

        holder.tvNodeCode.text = code
        holder.tvNodeLocation.text = locationText
        holder.tvNodeCapacity.text = "${capacity.toInt()} kWh"
        holder.tvNodeBattery.text = "$availSlots / $totalSlots"
        holder.tvNodeSchedule.text = "$openTime–$closeTime"

        if (isActive) {
            holder.tvNodeStatus.text = "● Active"
            holder.tvNodeStatus.setTextColor(Color.parseColor("#2D6A4F"))
            holder.tvNodeStatus.setBackgroundResource(R.drawable.bg_status_badge_active)
        } else {
            holder.tvNodeStatus.text = "● Inactive"
            holder.tvNodeStatus.setTextColor(Color.parseColor("#C62828"))
            holder.tvNodeStatus.setBackgroundResource(R.drawable.bg_status_badge_inactive)
        }

        // Handle View Details button click
        val openDetails = View.OnClickListener {
            val context = holder.itemView.context
            val nodeId = node.optString("id", node.optString("_id", ""))
            val intent = Intent(context, NodeDetailsActivity::class.java).apply {
                putExtra("NODE_ID", nodeId)
                putExtra("NODE_CODE", code)
                putExtra("NODE_NAME", name)
                putExtra("NODE_ADDRESS", address)
                putExtra("NODE_CAPACITY", capacity)
                putExtra("NODE_TOTAL_SLOTS", totalSlots)
                putExtra("NODE_AVAIL_SLOTS", availSlots)
                putExtra("NODE_OPEN_TIME", openTime)
                putExtra("NODE_CLOSE_TIME", closeTime)
                putExtra("NODE_IS_ACTIVE", isActive)
                putExtra("NODE_LAT", node.optDouble("latitude", node.optDouble("Latitude", 0.0)))
                putExtra("NODE_LONG", node.optDouble("longitude", node.optDouble("Longitude", 0.0)))
                putExtra("NODE_OPERATING_DAYS", node.optString("operatingDays", node.optString("OperatingDays", "Mon-Sun")))
            }
            context.startActivity(intent)
        }

        holder.btnViewDetails.setOnClickListener(openDetails)
        holder.itemView.setOnClickListener(openDetails)
    }

    override fun getItemCount() = filteredNodes.size

    // Live search filter by code, name, or address
    fun filter(query: String) {
        val search = query.trim().lowercase(Locale.getDefault())
        filteredNodes.clear()
        if (search.isEmpty()) {
            filteredNodes.addAll(rawNodeList)
        } else {
            for (node in rawNodeList) {
                val code = node.optString("nodeCode", node.optString("NodeCode", "")).lowercase(Locale.getDefault())
                val name = node.optString("name", node.optString("Name", "")).lowercase(Locale.getDefault())
                val address = node.optString("address", node.optString("Address", "")).lowercase(Locale.getDefault())

                if (code.contains(search) || name.contains(search) || address.contains(search)) {
                    filteredNodes.add(node)
                }
            }
        }
        notifyDataSetChanged()
    }
}
