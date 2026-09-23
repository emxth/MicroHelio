package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.microhelio.api.ApiClient
import com.example.microhelio.models.ProsumerProfileResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ProsumerProfileActivity : AppCompatActivity() {

    private lateinit var tvFullName: TextView
    private lateinit var tvNic: TextView
    private lateinit var tvEmail: TextView
    private lateinit var tvPhone: TextView
    private lateinit var tvAddress: TextView
    private lateinit var tvActivationStatus: TextView
    private lateinit var tvActiveStatus: TextView
    private lateinit var tvCreatedDate: TextView
    private lateinit var btnEditProfile: Button
    private lateinit var btnLogout: Button
    private lateinit var btnDeactivate: Button

    private lateinit var sessionManager: SessionManager
    private var currentProfile: ProsumerProfileResponse? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_profile)

        sessionManager = SessionManager(this)

        tvFullName = findViewById(R.id.tvFullName)
        tvNic = findViewById(R.id.tvNic)
        tvEmail = findViewById(R.id.tvEmail)
        tvPhone = findViewById(R.id.tvPhone)
        tvAddress = findViewById(R.id.tvAddress)
        tvActivationStatus = findViewById(R.id.tvActivationStatus)
        tvActiveStatus = findViewById(R.id.tvActiveStatus)
        tvCreatedDate = findViewById(R.id.tvCreatedDate)
        btnEditProfile = findViewById(R.id.btnEditProfile)
        btnLogout = findViewById(R.id.btnLogout)
        btnDeactivate = findViewById(R.id.btnDeactivate)

        // Back arrow
        findViewById<android.widget.ImageView>(R.id.ivBack).setOnClickListener {
            finish()
        }

        btnLogout.setOnClickListener {
            logout()
        }

        btnDeactivate.setOnClickListener {
            showDeactivateConfirmationDialog()
        }

        btnEditProfile.setOnClickListener {
            val profile = currentProfile
            if (profile != null) {
                val intent = Intent(this, EditProfileActivity::class.java)
                intent.putExtra("EXTRA_NIC", profile.nic)
                intent.putExtra("EXTRA_FULL_NAME", profile.fullName)
                intent.putExtra("EXTRA_EMAIL", profile.email)
                intent.putExtra("EXTRA_PHONE", profile.phone)
                intent.putExtra("EXTRA_ADDRESS", profile.address)
                startActivity(intent)
            } else {
                Toast.makeText(this, "Profile not loaded yet", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        fetchProfile()
    }

    private fun fetchProfile() {
        val session = sessionManager.getSession()
        if (session == null || session.accountIdentifier.isBlank() || session.token.isBlank()) {
            logout()
            return
        }

        val nic = session.accountIdentifier
        val token = "Bearer ${session.token}"

        ApiClient.apiService.getProsumerByNic(nic, token).enqueue(object : Callback<ProsumerProfileResponse> {
            override fun onResponse(call: Call<ProsumerProfileResponse>, response: Response<ProsumerProfileResponse>) {
                when {
                    response.isSuccessful && response.body() != null -> {
                        currentProfile = response.body()
                        displayProfile(response.body()!!)
                    }
                    response.code() == 401 || response.code() == 403 -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Session expired or unauthorized", Toast.LENGTH_LONG).show()
                        logout()
                    }
                    response.code() == 404 -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Account not found", Toast.LENGTH_LONG).show()
                    }
                    else -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Failed to load profile: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            override fun onFailure(call: Call<ProsumerProfileResponse>, t: Throwable) {
                Toast.makeText(this@ProsumerProfileActivity, "Network error: Cannot reach server", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun displayProfile(profile: ProsumerProfileResponse) {
        tvFullName.text = "Name: ${profile.fullName}"
        tvNic.text = "NIC: ${profile.nic}"
        tvEmail.text = "Email: ${profile.email}"
        tvPhone.text = "Phone: ${profile.phone}"
        tvAddress.text = "Address: ${profile.address}"
        tvActivationStatus.text = "Activation: ${profile.activationStatus}"
        tvActiveStatus.text = "Status: ${if (profile.isActive) "Active" else "Inactive"}"
        
        // Format the date nicer
        try {
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
            val formatter = java.text.SimpleDateFormat("MMM dd, yyyy", java.util.Locale.US)
            val date = parser.parse(profile.createdAt)
            tvCreatedDate.text = "Created: ${if (date != null) formatter.format(date) else profile.createdAt}"
        } catch (e: Exception) {
            tvCreatedDate.text = "Created: ${profile.createdAt}"
        }
    }

    private fun logout() {
        sessionManager.clearSession()
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showDeactivateConfirmationDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Deactivate Account?")
            .setMessage("You will not be able to log in again until Backoffice reactivates your account.")
            .setPositiveButton("Confirm Deactivation") { dialog, _ ->
                deactivateAccount()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun deactivateAccount() {
        val session = sessionManager.getSession()
        if (session == null || session.accountIdentifier.isBlank() || session.token.isBlank()) {
            logout()
            return
        }

        btnDeactivate.isEnabled = false
        val nic = session.accountIdentifier
        val token = "Bearer ${session.token}"

        ApiClient.apiService.deactivateProsumer(nic, token).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                btnDeactivate.isEnabled = true
                when {
                    response.isSuccessful -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Account deactivated successfully", Toast.LENGTH_LONG).show()
                        logout()
                    }
                    response.code() == 400 -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Failed to deactivate account (Validation Error)", Toast.LENGTH_LONG).show()
                    }
                    response.code() == 401 || response.code() == 403 -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Session expired or unauthorized", Toast.LENGTH_LONG).show()
                        logout()
                    }
                    response.code() == 404 -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Account not found", Toast.LENGTH_LONG).show()
                    }
                    else -> {
                        Toast.makeText(this@ProsumerProfileActivity, "Failed to deactivate: ${response.code()}", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                btnDeactivate.isEnabled = true
                Toast.makeText(this@ProsumerProfileActivity, "Network error: Cannot reach server", Toast.LENGTH_SHORT).show()
            }
        })
    }
}
