/*
 * Author: Ashwin
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

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvCode: TextView = view.findViewById(R.id.tvReservationCode)
        val tvStatus: TextView = view.findViewById(R.id.tvStatusBadge)
        val tvNodeAndType: TextView = view.findViewById(R.id.tvNodeAndType)
        val tvDateTime: TextView = view.findViewById(R.id.tvDateTime)
        val tvCapacity: TextView = view.findViewById(R.id.tvCapacity)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_reservation, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val res = reservations[position]
        holder.tvCode.text = res.optString("reservationCode", "N/A")

        val status = res.optString("status", "Unknown")
        holder.tvStatus.text = status

        when (status) {
            "Approved" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#52B788"))
            "Pending" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#E9C46A"))
            "Cancelled" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#C92A2A"))
            else -> holder.tvStatus.setBackgroundColor(Color.parseColor("#748C7E"))
        }

        holder.tvNodeAndType.text = "Node ID: ${res.optString("nodeId")} | Type: ${res.optString("reservationType")}"

        val rawDate = res.optString("scheduledDate").split("T")[0]
        holder.tvDateTime.text = "Date: $rawDate | ${res.optString("scheduledStartTime")} - ${res.optString("scheduledEndTime")}"

        holder.tvCapacity.text = "Requested Capacity: ${res.optDouble("requestedCapacityKWh")} KWh"

        // TAP TO EDIT/MANAGE BOOKING
        holder.itemView.setOnClickListener {
            val context = holder.itemView.context
            // Extract the MongoDB _id string (handles both "id" and "$oid" formats)
            val resId = res.optString("id", res.optString("_id"))

            val intent = Intent(context, UpdateReservationActivity::class.java).apply {
                putExtra("RESERVATION_ID", resId)
            }
            context.startActivity(intent)
        }
    }

    override fun getItemCount() = reservations.size
}