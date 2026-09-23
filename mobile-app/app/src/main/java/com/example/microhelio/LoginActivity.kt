package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class LoginActivity : AppCompatActivity() {

    private lateinit var etIdentifier: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvRegister: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        etIdentifier = findViewById(R.id.etIdentifier)
        etPassword = findViewById(R.id.etPassword)
        btnLogin = findViewById(R.id.btnLogin)
        tvRegister = findViewById(R.id.tvRegister)

        btnLogin.setOnClickListener {
            // Validation placeholder
            val identifier = etIdentifier.text.toString()
            val password = etPassword.text.toString()

            if (identifier.isBlank() || password.isBlank()) {
                Toast.makeText(this, "Please enter all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            btnLogin.isEnabled = false

            val request = com.example.microhelio.models.LoginRequest(identifier, password)
            com.example.microhelio.api.ApiClient.apiService.login(request).enqueue(object : retrofit2.Callback<com.example.microhelio.models.LoginResponse> {
                override fun onResponse(
                    call: retrofit2.Call<com.example.microhelio.models.LoginResponse>,
                    response: retrofit2.Response<com.example.microhelio.models.LoginResponse>
                ) {
                    btnLogin.isEnabled = true
                    if (response.isSuccessful && response.body() != null) {
                        val role = response.body()?.role
                        if (role == "Backoffice") {
                            Toast.makeText(this@LoginActivity, "Backoffice accounts use the MicroHelio web portal.", Toast.LENGTH_LONG).show()
                            return
                        }

                        val sessionManager = SessionManager(this@LoginActivity)
                        sessionManager.saveSession(response.body()!!)

                        if (role == "GridOperator") {
                            startActivity(Intent(this@LoginActivity, DashboardActivity::class.java))
                        } else if (role == "Prosumer") {
                            startActivity(Intent(this@LoginActivity, ProsumerProfileActivity::class.java))
                        }
                        finish()
                    } else if (response.code() == 400 || response.code() == 401) {
                        Toast.makeText(this@LoginActivity, "Invalid credentials or account unavailable", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@LoginActivity, "Server error: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onFailure(call: retrofit2.Call<com.example.microhelio.models.LoginResponse>, t: Throwable) {
                    btnLogin.isEnabled = true
                    Toast.makeText(this@LoginActivity, "Network error: Cannot reach server", Toast.LENGTH_SHORT).show()
                }
            })
        }

        tvRegister.setOnClickListener {
            val intent = Intent(this, RegisterProsumerActivity::class.java)
            startActivity(intent)
        }
    }
}
