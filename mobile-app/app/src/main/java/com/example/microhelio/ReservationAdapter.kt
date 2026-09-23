/*
 * Author: Arshvinth S
 * Purpose: RecyclerView adapter for displaying energy reservations in lists.
 */

package com.example.microhelio

import android.content.Intent
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject

class ReservationAdapter(private val reservations: List<JSONObject>) :
    RecyclerView.Adapter<ReservationAdapter.ViewHolder>() {

    // Cache list item view references
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvCode: TextView = view.findViewById(R.id.tvReservationCode)
        val tvStatus: TextView = view.findViewById(R.id.tvStatusBadge)
        val tvNodeAndType: TextView = view.findViewById(R.id.tvNodeAndType)
        val tvDateTime: TextView = view.findViewById(R.id.tvDateTime)
        val tvCapacity: TextView = view.findViewById(R.id.tvCapacity)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        // Inflate card layout for each row
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_reservation, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val res = reservations[position]
        holder.tvCode.text = res.optString("reservationCode", "N/A")

        val status = res.optString("status", "Unknown")
        holder.tvStatus.text = status

        // Color code status badge based on booking state
        when (status) {
            "Approved" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#52B788"))
            "Pending" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#E9C46A"))
            "Cancelled" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#C92A2A"))
            else -> holder.tvStatus.setBackgroundColor(Color.parseColor("#748C7E"))
        }

        // Display readable microgrid details instead of raw ID
        val nodeName = res.optString("nodeName", res.optString("nodeCode", "Microgrid Node"))
        val resType = res.optString("reservationType", "DropOff")
        holder.tvNodeAndType.text = "$nodeName | Type: $resType"

        // Format date string and display times
        val rawDate = res.optString("scheduledDate").split("T")[0]
        holder.tvDateTime.text = "Date: $rawDate | ${res.optString("scheduledStartTime")} - ${res.optString("scheduledEndTime")}"

        holder.tvCapacity.text = "Requested Capacity: ${res.optDouble("requestedCapacityKWh")} KWh"

        // TAP TO EDIT/MANAGE BOOKING
        holder.itemView.setOnClickListener {
            val context = holder.itemView.context
            // Extract MongoDB ID safely
            val resId = res.optString("id", res.optString("_id"))

            // Launch update screen passing the selected booking ID
            val intent = Intent(context, UpdateReservationActivity::class.java).apply {
                putExtra("RESERVATION_ID", resId)
            }
            context.startActivity(intent)
        }
    }

    override fun getItemCount() = reservations.size
}