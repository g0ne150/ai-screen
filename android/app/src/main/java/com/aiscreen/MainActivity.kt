package com.aiscreen

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    companion object {
        private const val PREF_SERVER_URL = "server_url"
        private const val INTENT_EXTRA_URL = "server_url"
        private const val EXIT_TIMEOUT_MS = 2000L
    }

    private lateinit var webView: WebView
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var prefs: SharedPreferences
    private var exitPressedOnce = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        prefs = getSharedPreferences("ai_screen", Context.MODE_PRIVATE)

        webView = findViewById(R.id.webView)
        loadingIndicator = findViewById(R.id.loadingIndicator)

        setupWebView()

        val url = resolveUrl()
        if (url == null) {
            startSettingsActivity()
        } else {
            webView.loadUrl(url)
        }
    }

    private fun resolveUrl(): String? {
        intent.getStringExtra(INTENT_EXTRA_URL)?.let { return it }
        prefs.getString(PREF_SERVER_URL, null)?.let { return it }
        return null
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = false

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                loadingIndicator.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                loadingIndicator.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                loadingIndicator.visibility = View.GONE
                if (request?.isForMainFrame == true) {
                    showConnectionFailureDialog()
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean = false
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                loadingIndicator.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }
        }

        webView.isFocusable = true
        webView.isFocusableInTouchMode = true
        webView.requestFocus()
    }

    private fun showConnectionFailureDialog() {
        AlertDialog.Builder(this)
            .setTitle("Connection Failed")
            .setMessage("Could not connect to the AI Screen server.")
            .setPositiveButton("Retry") { _, _ ->
                prefs.getString(PREF_SERVER_URL, null)?.let { webView.loadUrl(it) }
            }
            .setNeutralButton("Change URL") { _, _ -> startSettingsActivity() }
            .setNegativeButton("Exit") { _, _ -> finishAffinity() }
            .setCancelable(false)
            .show()
    }

    private fun startSettingsActivity() {
        val intent = Intent(this, SettingsActivity::class.java)
        prefs.getString(PREF_SERVER_URL, null)?.let {
            intent.putExtra("current_url", it)
        }
        startActivity(intent)
    }

    private fun enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
        enterImmersiveMode()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
        webView.pauseTimers()
    }

    override fun onDestroy() {
        super.onDestroy()
        webView.destroy()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (exitPressedOnce) {
                    finishAffinity()
                } else {
                    exitPressedOnce = true
                    Toast.makeText(this, "Press again to exit", Toast.LENGTH_SHORT).show()
                    webView.postDelayed({ exitPressedOnce = false }, EXIT_TIMEOUT_MS)
                }
                true
            }
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                startSettingsActivity()
                true
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }
}
