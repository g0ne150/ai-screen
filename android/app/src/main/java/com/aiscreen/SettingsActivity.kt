package com.aiscreen

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {

    companion object {
        private const val PREF_SERVER_URL = "server_url"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val urlInput: EditText = findViewById(R.id.urlInput)
        val connectButton: Button = findViewById(R.id.connectButton)

        intent.getStringExtra("current_url")?.let {
            urlInput.setText(it)
            urlInput.setSelection(it.length)
        }

        urlInput.isFocusable = true
        urlInput.isFocusableInTouchMode = true
        connectButton.isFocusable = true
        connectButton.isFocusableInTouchMode = true

        connectButton.setOnClickListener {
            val url = urlInput.text.toString().trim()

            if (url.isBlank()) {
                urlInput.error = "URL is required"
                return@setOnClickListener
            }

            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                urlInput.error = "URL must start with http:// or https://"
                return@setOnClickListener
            }

            getSharedPreferences("ai_screen", Context.MODE_PRIVATE)
                .edit()
                .putString(PREF_SERVER_URL, url)
                .apply()

            val intent = Intent(this, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            startActivity(intent)
            finish()
        }
    }
}
