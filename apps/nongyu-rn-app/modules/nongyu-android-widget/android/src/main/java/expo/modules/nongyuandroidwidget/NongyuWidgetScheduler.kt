package expo.modules.nongyuandroidwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/** 小组件立即刷新 + 约 10 分钟周期闹钟 */
object NongyuWidgetScheduler {
    const val ACTION_UPDATE = "com.nongyu.app.UPDATE_WIDGET"
    private const val INTERVAL_MS = 10 * 60 * 1000L
    private const val REQUEST_CODE = 41001

    fun requestUpdate(context: Context) {
        val mgr = AppWidgetManager.getInstance(context)
        val cn = ComponentName(context, TodayCourseWidget::class.java)
        val ids = mgr.getAppWidgetIds(cn)
        for (id in ids) {
            updateAppWidget(context, mgr, id)
        }
        if (ids.isNotEmpty()) {
            ensurePeriodicRefresh(context)
        }
    }

    fun ensurePeriodicRefresh(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.setRepeating(
            AlarmManager.RTC,
            System.currentTimeMillis() + INTERVAL_MS,
            INTERVAL_MS,
            pendingUpdate(context),
        )
    }

    fun cancelPeriodicRefresh(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingUpdate(context))
    }

    private fun pendingUpdate(context: Context): PendingIntent {
        val intent = Intent(context, TodayCourseWidget::class.java).setAction(ACTION_UPDATE)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
