/*
 * Author: Sewwandi S
 * Purpose: RecyclerView adapter for displaying Booking Slots in Node Details screen with battery slot validation and duplicate booking prevention.
 */

package com.example.microhelio

import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject

class SlotAdapter(
    private val slots: List<JSONObject>,
    private val nodeId: String,
    private val availableBatterySlots: Int
) : RecyclerView.Adapter<SlotAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvSlotTime: TextView = view.findViewById(R.id.tvSlotTime)
        val tvSlotDate: TextView = view.findViewById(R.id.tvSlotDate)
        val tvSlotType: TextView = view.findViewById(R.id.tvSlotType)
        val tvSlotStatus: TextView = view.findViewById(R.id.tvSlotStatus)
        val tvSlotCapacity: TextView = view.findViewById(R.id.tvSlotCapacity)
        val btnBookThisSlot: Button = view.findViewById(R.id.btnBookThisSlot)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_node_slot, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val slot = slots[position]

        val slotId = slot.optString("id", slot.optString("_id", ""))
        val rawDate = slot.optString("slotDate", slot.optString("SlotDate", "Today"))
        val date = if (rawDate.contains("T")) rawDate.split("T")[0] else rawDate

        val startTime = slot.optString("slotStartTime", slot.optString("SlotStartTime", "08:00"))
        val endTime = slot.optString("slotEndTime", slot.optString("SlotEndTime", "10:00"))
        val slotType = slot.optString("slotType", slot.optString("SlotType", "DropOff"))

        val totalCapacity = slot.optDouble("totalCapacityKWh", slot.optDouble("TotalCapacityKWh", 50.0))
        val availCapacity = slot.optDouble("availableCapacityKWh", slot.optDouble("AvailableCapacityKWh", totalCapacity))
        val isSlotAvailable = slot.optBoolean("isAvailable", slot.optBoolean("IsAvailable", true)) && availCapacity > 0.0

        holder.tvSlotTime.text = "$startTime - $endTime"
        holder.tvSlotDate.text = "Date: $date"
        holder.tvSlotType.text = slotType
        holder.tvSlotCapacity.text = "$availCapacity kWh / $totalCapacity kWh"

        if (isSlotAvailable) {
            holder.tvSlotStatus.text = "Available"
            holder.tvSlotStatus.setTextColor(Color.parseColor("#2D6A4F"))
            holder.tvSlotStatus.setBackgroundResource(R.drawable.bg_status_badge_active)

            holder.btnBookThisSlot.visibility = View.VISIBLE
            holder.btnBookThisSlot.text = "Book Slot"
            holder.btnBookThisSlot.isEnabled = true
            holder.btnBookThisSlot.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#2D6A4F"))

            // Click listener for reserving an available slot
            val bookAction = View.OnClickListener {
                val context = holder.itemView.context

                // Physical battery slot availability check for DropOff or Charging
                if (availableBatterySlots <= 0) {
                    Toast.makeText(
                        context,
                        "No battery slots are currently available at this node.",
                        Toast.LENGTH_LONG
                    ).show()
                    return@OnClickListener
                }

                // Proceed to reservation screen passing target node and slot IDs
                val intent = Intent(context, CreateReservationActivity::class.java).apply {
                    putExtra("SELECTED_NODE_ID", nodeId)
                    putExtra("SELECTED_SLOT_ID", slotId)
                    putExtra("SELECTED_SLOT_DATE", date)
                    putExtra("SELECTED_START_TIME", startTime)
                    putExtra("SELECTED_END_TIME", endTime)
                    putExtra("MAX_CAPACITY", availCapacity)
                    putExtra("SLOT_TYPE", slotType)
                }
                context.startActivity(intent)
            }

            holder.btnBookThisSlot.setOnClickListener(bookAction)
            holder.itemView.setOnClickListener(bookAction)
        } else {
            // Already Booked / Reserved slot: Hide the Book Slot button completely
            holder.tvSlotStatus.text = "Reserved"
            holder.tvSlotStatus.setTextColor(Color.parseColor("#C62828"))
            holder.tvSlotStatus.setBackgroundResource(R.drawable.bg_status_badge_inactive)

            holder.btnBookThisSlot.visibility = View.GONE
            holder.btnBookThisSlot.setOnClickListener(null)
            holder.itemView.setOnClickListener(null)
        }
    }

    override fun getItemCount() = slots.size
}
