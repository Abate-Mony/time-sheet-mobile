package expo.modules.activejobnotification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TAG = "ActiveJobNotification"
private const val CHANNEL_ID = "active_jobs"

// The app only ever has one active (in-progress) assignment at a time — see
// GET /workers/active-job on the backend, which returns a single job or
// null. A single fixed notification ID is therefore sufficient; every
// show() call updates this one notification in place instead of stacking
// new ones.
private const val NOTIFICATION_ID = 42710

private const val BRAND_COLOR = "#1E3A5F"

/**
 * Renders the "Job in progress" ongoing/sticky Android notification with a
 * native chronometer and progress bar — neither of which expo-notifications'
 * content API exposes (it supports `sticky`, but not `setProgress`,
 * `setUsesChronometer`, `setOnlyAlertOnce`, or `setPublicVersion`; confirmed
 * against ArgumentsNotificationContentBuilder/ExpoNotificationBuilder in
 * node_modules/expo-notifications).
 *
 * No foreground service: the app has no other legitimate continuous
 * background work (no continuous location tracking) to justify one, and an
 * ongoing NotificationCompat notification already survives backgrounding —
 * it just won't keep updating once the JS process is killed by the OS,
 * which is an accepted, documented limitation rather than a bug.
 */
class ActiveJobNotificationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ActiveJobNotification")

    OnCreate {
      ensureChannel()
    }

    AsyncFunction("show") { params: Map<String, Any?> ->
      try {
        show(params)
      } catch (e: Exception) {
        // A notification failure must never surface as a crash or bubble up
        // into the clock-in/out flow — it's a presentation enhancement, not
        // part of the authoritative work-session record.
        Log.w(TAG, "Failed to show active-job notification", e)
      }
    }

    AsyncFunction("cancel") {
      try {
        cancel()
      } catch (e: Exception) {
        Log.w(TAG, "Failed to cancel active-job notification", e)
      }
    }
  }

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No context available")

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Active jobs",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Shows your current INPRN job while you are clocked in."
      setShowBadge(false)
      enableVibration(false)
      setSound(null, null)
    }
    manager.createNotificationChannel(channel)
  }

  private fun show(params: Map<String, Any?>) {
    ensureChannel()

    // Notifications require POST_NOTIFICATIONS (API 33+) / can be disabled
    // by the user at any time — clock-in/out must keep working either way,
    // so this just quietly no-ops rather than throwing.
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return

    val jobId = params["jobId"] as? String ?: return
    val assignmentId = params["assignmentId"] as? String
    val title = params["title"] as? String ?: "Job in progress"
    val subtitle = params["subtitle"] as? String
    val timingLine = params["timingLine"] as? String
    val checkedInAtMs = (params["checkedInAtMs"] as? Number)?.toLong()
    val percentage = (params["percentage"] as? Number)?.toInt()
    val deepLink = params["deepLink"] as? String ?: "inprn://clock"

    Log.i(TAG, "show() jobId=$jobId percentage=$percentage checkedInAtMs=$checkedInAtMs subtitle=$subtitle timingLine=$timingLine")

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setAutoCancel(false)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setColor(Color.parseColor(BRAND_COLOR))
      .setPriority(NotificationCompat.PRIORITY_LOW)

    // Deliberately plain setContentText (no BigTextStyle) — Android's base
    // notification template reliably renders setProgress()'s bar alongside
    // plain title/text; wrapping content in a style risks the OEM's style
    // renderer dropping the progress element, which is the one thing this
    // notification cannot afford to lose.
    val combinedText = listOfNotNull(subtitle, timingLine).joinToString(" · ")
    if (combinedText.isNotEmpty()) {
      builder.setContentText(combinedText)
    }

    if (checkedInAtMs != null) {
      builder.setUsesChronometer(true)
      builder.setWhen(checkedInAtMs)
      builder.setShowWhen(true)
    }

    // Omitted (not indeterminate) when the job has no reliable scheduled
    // duration — never fake a percentage, per spec.
    if (percentage != null) {
      builder.setProgress(100, percentage, false)
    }

    // Lock-screen-safe redacted version: no client/site names.
    val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle("INPRN")
      .setContentText("Job in progress")
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setColor(Color.parseColor(BRAND_COLOR))
      .build()
    builder.setPublicVersion(publicVersion)

    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
      putExtra("assignmentId", assignmentId)
      putExtra("jobId", jobId)
    }
    val pendingIntent = PendingIntent.getActivity(
      context,
      NOTIFICATION_ID,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    builder.setContentIntent(pendingIntent)

    // notify() with the same stable ID updates the existing notification in
    // place — never creates a second one.
    NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
  }

  private fun cancel() {
    Log.i(TAG, "cancel()")
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }
}
