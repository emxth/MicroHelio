package com.example.microhelio

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class RegisterProsumerActivity : AppCompatActivity() {

    private lateinit var etNic: EditText
    private lateinit var etFullName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPhone: EditText
    private lateinit var etAddress: EditText
    private lateinit var etPassword: EditText
    private lateinit var etConfirmPassword: EditText
    private lateinit var btnRegister: Button
    private lateinit var tvLogin: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register_prosumer)

        etNic = findViewById(R.id.etNic)
        etFullName = findViewById(R.id.etFullName)
        etEmail = findViewById(R.id.etEmail)
        etPhone = findViewById(R.id.etPhone)
        etAddress = findViewById(R.id.etAddress)
        etPassword = findViewById(R.id.etPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        btnRegister = findViewById(R.id.btnRegister)
        tvLogin = findViewById(R.id.tvLogin)

        btnRegister.setOnClickListener {
            val nic = etNic.text.toString()
            val fullName = etFullName.text.toString()
            val email = etEmail.text.toString()
            val phone = etPhone.text.toString()
            val address = etAddress.text.toString()
            val password = etPassword.text.toString()
            val confirmPassword = etConfirmPassword.text.toString()

            if (nic.isBlank() || fullName.isBlank() || email.isBlank() || phone.isBlank() ||
                address.isBlank() || password.isBlank() || confirmPassword.isBlank()
            ) {
                Toast.makeText(this, "Please enter all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (password != confirmPassword) {
                Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val request = com.example.microhelio.models.RegisterProsumerRequest(
                nic = nic,
                fullName = fullName,
                email = email,
                phone = phone,
                address = address,
                password = password
            )

            com.example.microhelio.api.ApiClient.apiService.registerProsumer(request)
                .enqueue(object : retrofit2.Callback<Void> {
                    override fun onResponse(call: retrofit2.Call<Void>, response: retrofit2.Response<Void>) {
                        if (response.isSuccessful || response.code() == 201) {
                            Toast.makeText(this@RegisterProsumerActivity, "Registration successful. Please wait for Backoffice activation.", Toast.LENGTH_LONG).show()
                            finish() // Return to LoginActivity
                        } else {
                            when (response.code()) {
                                400 -> Toast.makeText(this@RegisterProsumerActivity, "Validation error", Toast.LENGTH_SHORT).show()
                                409 -> Toast.makeText(this@RegisterProsumerActivity, "Duplicate NIC/Email", Toast.LENGTH_SHORT).show()
                                else -> Toast.makeText(this@RegisterProsumerActivity, "Registration failed: ${response.code()}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }

                    override fun onFailure(call: retrofit2.Call<Void>, t: Throwable) {
                        Toast.makeText(this@RegisterProsumerActivity, "Network error: ${t.message}", Toast.LENGTH_SHORT).show()
                    }
                })
        }

        tvLogin.setOnClickListener {
            // Because LoginActivity is below us on the back stack, we just finish this activity
            finish()
        }
    }
}
