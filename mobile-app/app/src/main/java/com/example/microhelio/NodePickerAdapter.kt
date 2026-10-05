/*
 * Author: Arshvinth S
 * Purpose: RecyclerView adapter for the interactive node selection modal window in reservation flow.
 */

package com.example.microhelio

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject

class NodePickerAdapter(
    private val nodes: List<JSONObject>,
    private val onNodeSelected: (JSONObject) -> Unit
) : RecyclerView.Adapter<NodePickerAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val cardNodePicker: CardView = view.findViewById(R.id.cardNodePicker)
        val tvPickerNodeCode: TextView = view.findViewById(R.id.tvPickerNodeCode)
        val tvPickerNodeAddress: TextView = view.findViewById(R.id.tvPickerNodeAddress)
        val tvPickerNodeSlots: TextView = view.findViewById(R.id.tvPickerNodeSlots)
        val tvPickerNodeStatus: TextView = view.findViewById(R.id.tvPickerNodeStatus)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_node_picker, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val node = nodes[position]

        val code = node.optString("nodeCode", node.optString("NodeCode", "Node"))
        val name = node.optString("name", node.optString("Name", "Microgrid Station"))
        val address = node.optString("address", node.optString("Address", "N/A"))

        val totalSlots = node.optInt("totalBatterySlots", node.optInt("TotalBatterySlots", 10))
        val availSlots = node.optInt("availableBatterySlots", node.optInt("AvailableBatterySlots", 10))
        val isActive = node.optBoolean("isActive", node.optBoolean("IsActive", true))

        holder.tvPickerNodeCode.text = "$code - $name"
        holder.tvPickerNodeAddress.text = "Location: $address"
        holder.tvPickerNodeSlots.text = "Battery Slots: $availSlots / $totalSlots available"

        if (isActive) {
            holder.tvPickerNodeStatus.text = "● Active"
            holder.tvPickerNodeStatus.setTextColor(Color.parseColor("#2D6A4F"))
            holder.tvPickerNodeStatus.setBackgroundResource(R.drawable.bg_status_badge_active)
        } else {
            holder.tvPickerNodeStatus.text = "● Inactive"
            holder.tvPickerNodeStatus.setTextColor(Color.parseColor("#C62828"))
            holder.tvPickerNodeStatus.setBackgroundResource(R.drawable.bg_status_badge_inactive)
        }

        holder.cardNodePicker.setOnClickListener {
            onNodeSelected(node)
        }
    }

    override fun getItemCount() = nodes.size
}
