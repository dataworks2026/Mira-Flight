package com.miraflight

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainApplication : Application(), ReactApplication {

  override fun attachBaseContext(base: Context?) {
    super.attachBaseContext(base)
    // DJI MSDK v5 anti-tamper/native loader — must run before any DJI SDK use.
    com.cySdkyc.clx.Helper.install(this)
  }

  // Persist uncaught Kotlin/Java/JNI crashes (e.g. DJI native errors) to a file
  // that survives the crash, so they're recoverable when the tablet returns:
  //   adb shell run-as com.miraflight cat files/mira_crash.log
  private fun installNativeCrashLogger() {
    val previous = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, ex ->
      try {
        val sw = StringWriter()
        ex.printStackTrace(PrintWriter(sw))
        val ts = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).format(Date())
        File(filesDir, "mira_crash.log")
          .appendText("$ts [${thread.name}] $sw\n")
      } catch (_: Throwable) {
        // never let crash logging mask the original crash
      }
      previous?.uncaughtException(thread, ex)
    }
  }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(DJIBridgePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    installNativeCrashLogger()
    loadReactNative(this)
  }
}
