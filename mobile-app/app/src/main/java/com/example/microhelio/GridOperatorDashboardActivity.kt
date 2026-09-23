package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class GridOperatorDashboardActivity : AppCompatActivity() {

    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_grid_operator_dashboard)

        sessionManager = SessionManager(this)

        val tvWelcome = findViewById<TextView>(R.id.tvGridOpWelcome)
        val btnLogout = findViewById<Button>(R.id.btnGridOpLogout)

        val session = sessionManager.getSession()
        if (session != null && session.fullName.isNotBlank()) {
            tvWelcome.text = "Welcome, ${session.fullName}"
        }

        btnLogout.setOnClickListener {
            sessionManager.clearSession()
            val intent = Intent(this, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }
}
