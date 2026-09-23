package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        val sessionManager = SessionManager(this)
        if (sessionManager.isSessionValid()) {
            val session = sessionManager.getSession()
            if (session?.role == "GridOperator") {
                startActivity(Intent(this, DashboardActivity::class.java))
            } else if (session?.role == "Prosumer") {
                startActivity(Intent(this, ProsumerProfileActivity::class.java))
            } else {
                sessionManager.clearSession()
                startActivity(Intent(this, LoginActivity::class.java))
            }
        } else {
            sessionManager.clearSession()
            startActivity(Intent(this, LoginActivity::class.java))
        }
        finish()
    }
}