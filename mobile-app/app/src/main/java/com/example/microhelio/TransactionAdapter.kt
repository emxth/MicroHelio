package com.example.microhelio

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject

class TransactionAdapter(private val transactions: List<JSONObject>) :
    RecyclerView.Adapter<TransactionAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvTrxCode: TextView = view.findViewById(R.id.tvItemTrxCode)
        val tvStatus: TextView = view.findViewById(R.id.tvItemTrxStatus)
        val tvProsumerNic: TextView = view.findViewById(R.id.tvItemProsumerNic)
        val tvKWh: TextView = view.findViewById(R.id.tvItemKWh)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_transaction, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = transactions[position]
        val code = item.optString("transactionCode", "TRX-N/A")
        val status = item.optString("transactionStatus", "Initiated")
        val nic = item.optString("prosumerNic", "N/A")
        val kWh = item.optDouble("energyTransferredKWh", 0.0)

        holder.tvTrxCode.text = code
        holder.tvStatus.text = status
        holder.tvProsumerNic.text = "Prosumer NIC: $nic"
        holder.tvKWh.text = "Energy Transferred: $kWh KWh"

        when (status) {
            "Completed" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#52B788"))
            "Initiated" -> holder.tvStatus.setBackgroundColor(Color.parseColor("#E9C46A"))
            else -> holder.tvStatus.setBackgroundColor(Color.parseColor("#748C7E"))
        }
    }

    override fun getItemCount() = transactions.size
}
