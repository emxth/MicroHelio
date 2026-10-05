/**
 * File: SplashActivity.kt
 * Description: Initial landing screen for the MicroHelio Android application.
 *              Displays the brand logo and a loading spinner for 3 seconds before
 *              transitioning to the application's main entry point (LoginActivity).
 */

package com.example.microhelio

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity

/**
 * SplashActivity displays the startup splash screen and redirects the user
 * to the LoginActivity after a 3000ms delay.
 */
class SplashActivity : AppCompatActivity() {

    companion object {
        // Splash screen duration in milliseconds (3 seconds)
        private const val SPLASH_DURATION_MS = 3000L
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Hide ActionBar for a clean, full-screen white splash experience
        supportActionBar?.hide()

        // Set the splash screen layout
        setContentView(R.layout.activity_splash)

        // Schedule transition to LoginActivity after 3 seconds
        Handler(Looper.getMainLooper()).postDelayed({
            // Launch the primary starting activity (LoginActivity)
            val intent = Intent(this@SplashActivity, LoginActivity::class.java)
            startActivity(intent)

            // Finish SplashActivity so it is removed from the back stack
            finish()
        }, SPLASH_DURATION_MS)
    }
}
