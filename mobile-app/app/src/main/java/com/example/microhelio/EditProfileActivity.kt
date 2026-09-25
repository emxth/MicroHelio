package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.microhelio.api.ApiClient
import com.example.microhelio.models.ProsumerProfileResponse
import com.example.microhelio.models.UpdateProsumerRequest
import com.google.android.material.textfield.TextInputEditText
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class EditProfileActivity : AppCompatActivity() {

    private lateinit var tvNicReadOnly: TextView
    private lateinit var etFullName: TextInputEditText
    private lateinit var etEmail: TextInputEditText
    private lateinit var etPhone: TextInputEditText
    private lateinit var etAddress: TextInputEditText
    private lateinit var etPassword: TextInputEditText
    private lateinit var btnSave: Button
    private lateinit var btnCancel: Button

    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_profile)

        sessionManager = SessionManager(this)

        tvNicReadOnly = findViewById(R.id.tvNicReadOnly)
        etFullName = findViewById(R.id.etFullName)
        etEmail = findViewById(R.id.etEmail)
        etPhone = findViewById(R.id.etPhone)
        etAddress = findViewById(R.id.etAddress)
        etPassword = findViewById(R.id.etPassword)
        btnSave = findViewById(R.id.btnSave)
        btnCancel = findViewById(R.id.btnCancel)

        // Prefill Data passed from Profile
        tvNicReadOnly.text = intent.getStringExtra("EXTRA_NIC") ?: ""
        etFullName.setText(intent.getStringExtra("EXTRA_FULL_NAME") ?: "")
        etEmail.setText(intent.getStringExtra("EXTRA_EMAIL") ?: "")
        etPhone.setText(intent.getStringExtra("EXTRA_PHONE") ?: "")
        etAddress.setText(intent.getStringExtra("EXTRA_ADDRESS") ?: "")

        btnCancel.setOnClickListener {
            finish()
        }

        btnSave.setOnClickListener {
            saveProfile()
        }
    }

    private fun saveProfile() {
        val fullName = etFullName.text.toString()
        val email = etEmail.text.toString()
        val phone = etPhone.text.toString()
        val address = etAddress.text.toString()
        val password = etPassword.text.toString()

        if (fullName.isBlank() || email.isBlank() || phone.isBlank() || address.isBlank()) {
            Toast.makeText(this, "Please fill in all required fields", Toast.LENGTH_SHORT).show()
            return
        }

        val session = sessionManager.getSession()
        if (session == null || session.accountIdentifier.isBlank() || session.token.isBlank()) {
            logout()
            return
        }

        val nic = session.accountIdentifier
        val token = "Bearer ${session.token}"

        // Optional password
        val passwordToSent = if (password.isNotBlank()) password else null

        val request = UpdateProsumerRequest(
            fullName = fullName,
            email = email,
            phone = phone,
            address = address,
            password = passwordToSent
        )

        btnSave.isEnabled = false

        ApiClient.apiService.updateProsumer(nic, token, request).enqueue(object : Callback<ProsumerProfileResponse> {
            override fun onResponse(call: Call<ProsumerProfileResponse>, response: Response<ProsumerProfileResponse>) {
                btnSave.isEnabled = true
                when {
                    response.isSuccessful && response.body() != null -> {
                        // Update local session name if changed
                        if (session.fullName != fullName) {
                            sessionManager.updateFullName(fullName)
                        }
                        Toast.makeText(this@EditProfileActivity, "Profile updated successfully!", Toast.LENGTH_SHORT).show()
                        finish() // Return to Profile Activity
                    }
                    response.code() == 400 -> {
                        Toast.makeText(this@EditProfileActivity, "Validation error. Check input fields.", Toast.LENGTH_LONG).show()
                    }
                    response.code() == 409 -> {
                        Toast.makeText(this@EditProfileActivity, "Email already in use.", Toast.LENGTH_LONG).show()
                    }
                    response.code() == 401 || response.code() == 403 -> {
                        Toast.makeText(this@EditProfileActivity, "Session expired or unauthorized", Toast.LENGTH_LONG).show()
                        logout()
                    }
                    response.code() == 404 -> {
                        Toast.makeText(this@EditProfileActivity, "Account not found", Toast.LENGTH_LONG).show()
                    }
                    else -> {
                        Toast.makeText(this@EditProfileActivity, "Failed to update profile: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            override fun onFailure(call: Call<ProsumerProfileResponse>, t: Throwable) {
                btnSave.isEnabled = true
                Toast.makeText(this@EditProfileActivity, "Network error: Cannot reach server", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun logout() {
        sessionManager.clearSession()
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
