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
        val tvProsumerNic: TextView = view.findViewById(R.id.tvProsumerNic)
        val tvNodeAndType: TextView = view.findViewById(R.id.tvNodeAndType)
        val tvDateTime: TextView = view.findViewById(R.id.tvDateTime)
        val tvCapacity: TextView = view.findViewById(R.id.tvCapacity)
        val btnViewQr: android.widget.Button = view.findViewById(R.id.btnViewQrCode)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        // Inflate card layout for each row
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_reservation, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val res = reservations[position]
        val resId = res.optString("id", res.optString("_id"))
        val resCode = res.optString("reservationCode", "N/A")
        val status = res.optString("status", "Unknown")
        val nic = res.optString("prosumerNic", res.optString("prosumerNIC", "N/A"))
        val nodeId = res.optString("nodeId", "")
        val nodeName = res.optString("nodeName", res.optString("nodeCode", "Microgrid Node"))
        val resType = res.optString("reservationType", "DropOff")
        val rawDate = if (res.optString("scheduledDate").contains("T")) res.optString("scheduledDate").split("T")[0] else res.optString("scheduledDate")
        val startTime = res.optString("scheduledStartTime", "")
        val endTime = res.optString("scheduledEndTime", "")
        val timeSlot = if (startTime.isNotEmpty()) "$startTime - $endTime" else ""
        val capacity = res.optDouble("requestedCapacityKWh", 0.0)

        holder.tvCode.text = resCode
        holder.tvStatus.text = status
        holder.tvProsumerNic.text = "Prosumer NIC: $nic"

        // Color code status badge based on booking state
        when (status) {
            "Approved" -> {
                holder.tvStatus.setBackgroundColor(Color.parseColor("#52B788"))
                holder.btnViewQr.visibility = View.VISIBLE
            }
            "Pending" -> {
                holder.tvStatus.setBackgroundColor(Color.parseColor("#E9C46A"))
                holder.btnViewQr.visibility = View.GONE
            }
            "Cancelled" -> {
                holder.tvStatus.setBackgroundColor(Color.parseColor("#C92A2A"))
                holder.btnViewQr.visibility = View.GONE
            }
            else -> {
                holder.tvStatus.setBackgroundColor(Color.parseColor("#748C7E"))
                holder.btnViewQr.visibility = View.GONE
            }
        }

        holder.tvNodeAndType.text = "$nodeName | Type: $resType"
        holder.tvDateTime.text = "Date: $rawDate | $timeSlot"
        holder.tvCapacity.text = "Requested Capacity: $capacity KWh"

        // SHOW QR CODE BUTTON
        holder.btnViewQr.setOnClickListener {
            val context = holder.itemView.context
            val intent = Intent(context, QrCodeGeneratorActivity::class.java).apply {
                putExtra("RESERVATION_ID", resId)
                putExtra("RESERVATION_CODE", resCode)
                putExtra("PROSUMER_NIC", nic)
                putExtra("NODE_ID", nodeId)
                putExtra("NODE_NAME", nodeName)
                putExtra("SCHEDULED_DATE", rawDate)
                putExtra("SCHEDULED_TIME", timeSlot)
                putExtra("CAPACITY", capacity)
                putExtra("STATUS", status)
            }
            context.startActivity(intent)
        }

        // TAP TO EDIT/MANAGE BOOKING
        holder.itemView.setOnClickListener {
            val context = holder.itemView.context
            // Launch update screen passing the selected booking ID
            val intent = Intent(context, UpdateReservationActivity::class.java).apply {
                putExtra("RESERVATION_ID", resId)
            }
            context.startActivity(intent)
        }
    }

    override fun getItemCount() = reservations.size
}