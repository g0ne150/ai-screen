package com.aiscreen

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity

class SettingsActivity : AppCompatActivity() {

    companion object {
        private const val PREF_SERVER_URL = "server_url"
        private const val PREF_USER_AGENT = "user_agent"
        private const val DEFAULT_UA_INDEX = 0
    }

    private var selectedUaIndex = DEFAULT_UA_INDEX

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val urlInput: EditText = findViewById(R.id.urlInput)
        val connectButton: Button = findViewById(R.id.connectButton)
        val uaSpinner: Spinner = findViewById(R.id.uaSpinner)

        // 恢复当前 URL
        intent.getStringExtra("current_url")?.let {
            urlInput.setText(it)
            urlInput.setSelection(it.length)
        }

        // UA 选项
        val uaLabels = MainActivity.UA_OPTIONS.map { it.label }
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, uaLabels)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        uaSpinner.adapter = adapter

        // 恢复当前 UA 选择
        val prefs = getSharedPreferences("ai_screen", Context.MODE_PRIVATE)
        selectedUaIndex = intent.getIntExtra("current_ua_index", prefs.getInt(PREF_USER_AGENT, DEFAULT_UA_INDEX))
        uaSpinner.setSelection(selectedUaIndex)

        uaSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedUaIndex = position
                // 立即保存 UA 选择
                getSharedPreferences("ai_screen", Context.MODE_PRIVATE)
                    .edit()
                    .putInt(PREF_USER_AGENT, position)
                    .apply()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
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
