/*
 * Author: Arshvinth S
 * Purpose: RecyclerView adapter for the interactive slot selection modal window, displaying green (available) and red (reserved) badges with date filtering options.
 */

package com.example.microhelio

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class SlotPickerAdapter(
    private val rawSlots: List<JSONObject>,
    private val onSlotSelected: (JSONObject) -> Unit
) : RecyclerView.Adapter<SlotPickerAdapter.ViewHolder>() {

    private val displayedSlots: ArrayList<JSONObject> = ArrayList(rawSlots)
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val cardSlotItem: CardView = view.findViewById(R.id.cardSlotItem)
        val tvPickerSlotTime: TextView = view.findViewById(R.id.tvPickerSlotTime)
        val tvPickerSlotDate: TextView = view.findViewById(R.id.tvPickerSlotDate)
        val tvPickerSlotCapacity: TextView = view.findViewById(R.id.tvPickerSlotCapacity)
        val tvPickerSlotBadge: TextView = view.findViewById(R.id.tvPickerSlotBadge)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_slot_picker, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val slot = displayedSlots[position]

        val rawDate = slot.optString("slotDate", slot.optString("SlotDate", "Today"))
        val date = if (rawDate.contains("T")) rawDate.split("T")[0] else rawDate

        val startTime = slot.optString("slotStartTime", slot.optString("SlotStartTime", "08:00"))
        val endTime = slot.optString("slotEndTime", slot.optString("SlotEndTime", "10:00"))

        val totalCapacity = slot.optDouble("totalCapacityKWh", slot.optDouble("TotalCapacityKWh", 50.0))
        val availCapacity = slot.optDouble("availableCapacityKWh", slot.optDouble("AvailableCapacityKWh", totalCapacity))
        
        // Slot availability determination
        val isAvailableFlag = slot.optBoolean("isAvailable", slot.optBoolean("IsAvailable", true))
        val isSlotAvailable = isAvailableFlag && availCapacity > 0.0

        holder.tvPickerSlotTime.text = "$startTime - $endTime"
        holder.tvPickerSlotDate.text = "Scheduled Date: $date"

        if (isSlotAvailable) {
            // GREEN MARK: Available Slot
            holder.tvPickerSlotCapacity.text = "Capacity: $availCapacity / $totalCapacity kWh available"
            holder.tvPickerSlotCapacity.setTextColor(Color.parseColor("#2D6A4F"))

            holder.tvPickerSlotBadge.text = "● Available"
            holder.tvPickerSlotBadge.setTextColor(Color.parseColor("#2D6A4F"))
            holder.tvPickerSlotBadge.setBackgroundResource(R.drawable.bg_status_badge_active)

            holder.cardSlotItem.alpha = 1.0f
            holder.cardSlotItem.setOnClickListener {
                onSlotSelected(slot)
            }
        } else {
            // RED MARK: Reserved / Fully Booked Slot
            holder.tvPickerSlotCapacity.text = "Capacity: Reserved / Fully Booked"
            holder.tvPickerSlotCapacity.setTextColor(Color.parseColor("#C62828"))

            holder.tvPickerSlotBadge.text = "● Reserved"
            holder.tvPickerSlotBadge.setTextColor(Color.parseColor("#C62828"))
            holder.tvPickerSlotBadge.setBackgroundResource(R.drawable.bg_status_badge_inactive)

            holder.cardSlotItem.alpha = 0.65f
            holder.cardSlotItem.setOnClickListener {
                Toast.makeText(
                    holder.itemView.context,
                    "This time slot is already reserved and unavailable.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    override fun getItemCount() = displayedSlots.size

    // Filter to display all slots
    fun filterAll(): Int {
        displayedSlots.clear()
        displayedSlots.addAll(rawSlots)
        notifyDataSetChanged()
        return displayedSlots.size
    }

    // Filter to show future dates from today onwards
    fun filterFutureDatesFromToday(): Int {
        val todayStr = dateFormat.format(Date())
        displayedSlots.clear()

        for (slot in rawSlots) {
            val rawDate = slot.optString("slotDate", slot.optString("SlotDate", ""))
            val dateStr = if (rawDate.contains("T")) rawDate.split("T")[0] else rawDate
            if (dateStr >= todayStr) {
                displayedSlots.add(slot)
            }
        }

        notifyDataSetChanged()
        return displayedSlots.size
    }

    // Filter by a specific selected date string (yyyy-MM-dd)
    fun filterBySpecificDate(targetDate: String): Int {
        displayedSlots.clear()

        for (slot in rawSlots) {
            val rawDate = slot.optString("slotDate", slot.optString("SlotDate", ""))
            val dateStr = if (rawDate.contains("T")) rawDate.split("T")[0] else rawDate
            if (dateStr == targetDate) {
                displayedSlots.add(slot)
            }
        }

        notifyDataSetChanged()
        return displayedSlots.size
    }
}
