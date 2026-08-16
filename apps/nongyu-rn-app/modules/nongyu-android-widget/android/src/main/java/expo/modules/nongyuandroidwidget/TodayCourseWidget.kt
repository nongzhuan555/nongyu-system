package expo.modules.nongyuandroidwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.ArrayDeque
import java.util.Calendar
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

class TodayCourseWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id)
        }
        NongyuWidgetScheduler.ensurePeriodicRefresh(context)
    }

    override fun onEnabled(context: Context) {
        NongyuWidgetScheduler.ensurePeriodicRefresh(context)
    }

    override fun onDisabled(context: Context) {
        NongyuWidgetScheduler.cancelPeriodicRefresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == NongyuWidgetScheduler.ACTION_UPDATE) {
            NongyuWidgetScheduler.requestUpdate(context)
        }
    }
}

private val START_TIMES = arrayOf("08:10", "09:05", "10:10", "11:05", "14:20", "15:15", "16:20", "17:15", "19:30", "20:25")
private val END_TIMES = arrayOf("08:55", "09:50", "10:55", "11:50", "15:05", "16:00", "17:05", "18:00", "20:15", "21:10")

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
) {
    val views = RemoteViews(context.packageName, R.layout.widget_today_course)
    bindOpenCourseTab(context, views)

    val scheduleFile = findScheduleFile(context.filesDir)
    if (scheduleFile == null || !scheduleFile.exists()) {
        applyCourseType(views)
        views.setTextViewText(R.id.widget_label_next, "")
        views.setTextViewText(R.id.widget_time_range, "")
        views.setTextViewText(R.id.widget_course_name, "欢迎使用农屿")
        views.setTextViewText(R.id.widget_teacher, "请打开App同步数据")
        views.setTextViewText(R.id.widget_room, "")
        views.setTextViewText(R.id.widget_seat, "")
        bindFooter(views, Calendar.getInstance())
        appWidgetManager.updateAppWidget(appWidgetId, views)
        return
    }

    try {
        renderSnapshot(views, JSONObject(scheduleFile.readText()))
    } catch (e: Exception) {
        applyCourseType(views)
        views.setTextViewText(R.id.widget_label_next, "")
        views.setTextViewText(R.id.widget_time_range, "")
        views.setTextViewText(R.id.widget_course_name, "数据加载异常")
        views.setTextViewText(R.id.widget_teacher, e.message ?: "未知错误")
        views.setTextViewText(R.id.widget_room, "")
        views.setTextViewText(R.id.widget_seat, "")
        bindFooter(views, Calendar.getInstance())
    }
    appWidgetManager.updateAppWidget(appWidgetId, views)
}

private fun bindOpenCourseTab(context: Context, views: RemoteViews) {
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("nongyu://course?from=widget")).apply {
        setPackage(context.packageName)
        addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP,
        )
    }
    val pending = PendingIntent.getActivity(
        context,
        41002,
        open,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    views.setOnClickPendingIntent(R.id.widget_container, pending)
}

private fun findScheduleFile(root: File): File? {
    val direct = File(root, "widget_schedule.json")
    if (direct.exists()) return direct
    val queue: ArrayDeque<Pair<File, Int>> = ArrayDeque()
    val files = root.listFiles() ?: return null
    for (f in files) {
        if (f.isFile && f.name == "widget_schedule.json") return f
        if (f.isDirectory) queue.add(Pair(f, 0))
    }
    val maxDepth = 3
    while (queue.isNotEmpty()) {
        val (dir, depth) = queue.removeFirst()
        if (depth >= maxDepth) continue
        val sub = dir.listFiles() ?: continue
        for (f in sub) {
            if (f.isFile && f.name == "widget_schedule.json") return f
            if (f.isDirectory) queue.add(Pair(f, depth + 1))
        }
    }
    return null
}

private fun renderSnapshot(views: RemoteViews, root: JSONObject) {
    val now = Calendar.getInstance()
    bindFooter(views, now)

    val semesterStartStr = root.optString("semesterStart", "")
    val coursesArr = root.optJSONArray("courses")
    val schedulesArr = root.optJSONArray("schedules")
    val examsArr = root.optJSONArray("exams")
    val examReady = root.optBoolean("examReady", false)

    val courseCount = coursesArr?.length() ?: 0
    val scheduleCount = schedulesArr?.length() ?: 0
    val examCount = examsArr?.length() ?: 0
    val hasLessonData = courseCount > 0 || scheduleCount > 0
    val hasExamData = examReady && examCount > 0

    if (!hasLessonData && !hasExamData && !examReady) {
        applyCourseType(views)
        fillEmpty(views, "请打开App同步课表", "未检测到课表数据")
        return
    }

    val semesterMonday = parseSemesterMonday(semesterStartStr)
    var currentWeek = 1
    if (semesterMonday != null) {
        val calNow = Calendar.getInstance()
        calNow.set(Calendar.HOUR_OF_DAY, 0)
        calNow.set(Calendar.MINUTE, 0)
        calNow.set(Calendar.SECOND, 0)
        calNow.set(Calendar.MILLISECOND, 0)
        val diff = calNow.timeInMillis - semesterMonday.timeInMillis + 12L * 60L * 60L * 1000L
        val days = (diff / (24L * 60L * 60L * 1000L)).toInt()
        currentWeek = max(1, (days / 7) + 1)
    }

    val maxCourseWeek = maxWeekFromCourses(coursesArr)
    val examMode =
        semesterMonday != null &&
            courseCount > 0 &&
            currentWeek > maxCourseWeek

    if (!examMode) {
        if (hasLessonData && semesterStartStr.isEmpty()) {
            applyCourseType(views)
            fillEmpty(views, "请设置开学日期", "前往课表页设置")
            return
        }
        renderCourseMode(views, now, currentWeek, coursesArr, schedulesArr)
        return
    }

    renderExamMode(views, now, examsArr, examReady)
}

private fun renderCourseMode(
    views: RemoteViews,
    now: Calendar,
    currentWeek: Int,
    coursesArr: JSONArray?,
    schedulesArr: JSONArray?,
) {
    applyCourseType(views)
    val today = weekdayMondayBased(now)
    val nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
    val todayLessons = mutableListOf<LessonSlot>()

    if (coursesArr != null) {
        for (i in 0 until coursesArr.length()) {
            val c = coursesArr.optJSONObject(i) ?: continue
            if (c.optInt("day", -1) != today) continue
            if (!courseMatchesWeek(currentWeek, c)) continue
            todayLessons.add(
                LessonSlot(
                    name = c.optString("name", "课程"),
                    teacher = c.optString("teacher", ""),
                    room = c.optString("room", ""),
                    startPeriod = c.optInt("startPeriod", 1),
                    endPeriod = c.optInt("endPeriod", 1),
                ),
            )
        }
    }
    if (schedulesArr != null) {
        for (i in 0 until schedulesArr.length()) {
            val s = schedulesArr.optJSONObject(i) ?: continue
            if (s.optInt("day", -1) != today) continue
            if (!scheduleMatchesWeek(currentWeek, s)) continue
            todayLessons.add(
                LessonSlot(
                    name = s.optString("title", "日程"),
                    teacher = "",
                    room = s.optString("location", ""),
                    startPeriod = s.optInt("startPeriod", 1),
                    endPeriod = s.optInt("endPeriod", 1),
                ),
            )
        }
    }

    todayLessons.sortWith(
        compareBy<LessonSlot> { it.startMinutes() }.thenBy { it.name },
    )

    val inProgress = todayLessons.filter { nowMinutes >= it.startMinutes() && nowMinutes < it.endMinutes() }
    val upcoming = todayLessons.filter { nowMinutes < it.startMinutes() }

    when {
        inProgress.isNotEmpty() -> {
            val lesson = inProgress.first()
            fillLesson(views, "正在上课", lesson)
        }
        upcoming.isNotEmpty() -> {
            val lesson = upcoming.first()
            fillLesson(views, "即将上课", lesson)
        }
        todayLessons.isNotEmpty() -> {
            fillEmpty(views, "今天的课已经上完", "今天的课已经上完")
        }
        else -> {
            fillEmpty(views, "今日无课", "自由安排")
        }
    }
}

private fun renderExamMode(
    views: RemoteViews,
    now: Calendar,
    examsArr: JSONArray?,
    examReady: Boolean,
) {
    applyExamType(views)
    if (!examReady) {
        fillEmpty(views, "请打开 App 同步考试安排", "请打开 App 同步考试安排")
        return
    }
    if (examsArr == null || examsArr.length() == 0) {
        fillEmpty(views, "暂无考试安排", "暂无考试安排")
        return
    }

    val parsed = mutableListOf<ParsedExam>()
    var unparsable = 0
    for (i in 0 until examsArr.length()) {
        val exam = examsArr.optJSONObject(i) ?: continue
        val range = parseExamRange(exam)
        if (range == null) {
            unparsable += 1
            continue
        }
        parsed.add(ParsedExam(exam, range.first, range.second))
    }

    if (parsed.isEmpty()) {
        fillEmpty(views, "暂无考试安排", "暂无考试安排")
        return
    }

    val nowMs = now.timeInMillis
    val inProgress = parsed.filter { nowMs >= it.startMs && nowMs <= it.endMs }.sortedBy { it.startMs }
    val upcoming = parsed.filter { nowMs < it.startMs }.sortedBy { it.startMs }
    val allDone = inProgress.isEmpty() && upcoming.isEmpty()

    when {
        inProgress.isNotEmpty() -> fillExam(views, "正在考试", inProgress.first().obj)
        upcoming.isNotEmpty() -> fillExam(views, "即将考试", upcoming.first().obj)
        allDone && unparsable == 0 -> fillEmpty(views, "本学期结束", "本学期结束，下学期再见")
        else -> fillEmpty(views, "暂无考试安排", "暂无考试安排")
    }
}

private fun fillLesson(views: RemoteViews, label: String, lesson: LessonSlot) {
    views.setTextViewText(R.id.widget_label_next, label)
    views.setTextViewText(R.id.widget_time_range, lesson.timeRange())
    views.setTextViewText(R.id.widget_course_name, lesson.name)
    views.setTextViewText(R.id.widget_teacher, if (lesson.teacher.isNotEmpty()) "教师：${lesson.teacher}" else "")
    views.setTextViewText(R.id.widget_room, if (lesson.room.isNotEmpty()) "地点：${lesson.room}" else "")
    views.setTextViewText(R.id.widget_seat, "")
}

private fun fillExam(views: RemoteViews, label: String, exam: JSONObject) {
    val name = exam.optString("name", "考试")
    val time = exam.optString("timeRaw", exam.optString("startTime", ""))
    val method = exam.optString("method", "")
    val room = exam.optString("room", "")
    val seat = exam.optString("seat", "")
    views.setTextViewText(R.id.widget_label_next, label)
    views.setTextViewText(R.id.widget_time_range, "")
    views.setTextViewText(R.id.widget_course_name, name)
    views.setTextViewText(R.id.widget_teacher, if (time.isNotEmpty()) time else "")
    val methodLine = if (method.isNotEmpty()) "考试性质：$method" else ""
    val roomLine = if (room.isNotEmpty()) "地点：$room" else ""
    views.setTextViewText(R.id.widget_room, listOf(methodLine, roomLine).filter { it.isNotEmpty() }.joinToString(" · "))
    views.setTextViewText(R.id.widget_seat, if (seat.isNotEmpty()) "座位：$seat" else "")
}

private fun fillEmpty(views: RemoteViews, label: String, title: String) {
    views.setTextViewText(R.id.widget_label_next, label)
    views.setTextViewText(R.id.widget_time_range, "")
    views.setTextViewText(R.id.widget_course_name, title)
    views.setTextViewText(R.id.widget_teacher, "")
    views.setTextViewText(R.id.widget_room, "")
    views.setTextViewText(R.id.widget_seat, "")
}

private fun bindFooter(views: RemoteViews, now: Calendar) {
    val weekStr = arrayOf("日", "一", "二", "三", "四", "五", "六")[now.get(Calendar.DAY_OF_WEEK) - 1]
    val dateStr = "${now.get(Calendar.MONTH) + 1}月${now.get(Calendar.DAY_OF_MONTH)}日 周$weekStr"
    val timeStr = String.format(Locale.getDefault(), "%02d:%02d", now.get(Calendar.HOUR_OF_DAY), now.get(Calendar.MINUTE))
    views.setTextViewText(R.id.widget_date, dateStr)
    views.setTextViewText(R.id.widget_update_time, timeStr)
}

private fun applyCourseType(views: RemoteViews) {
    views.setTextViewTextSize(R.id.widget_label_next, TypedValue.COMPLEX_UNIT_SP, 11f)
    views.setTextViewTextSize(R.id.widget_time_range, TypedValue.COMPLEX_UNIT_SP, 12f)
    views.setTextViewTextSize(R.id.widget_course_name, TypedValue.COMPLEX_UNIT_SP, 18f)
    views.setTextViewTextSize(R.id.widget_teacher, TypedValue.COMPLEX_UNIT_SP, 11f)
    views.setTextViewTextSize(R.id.widget_room, TypedValue.COMPLEX_UNIT_SP, 11f)
    views.setTextViewTextSize(R.id.widget_seat, TypedValue.COMPLEX_UNIT_SP, 10f)
}

private fun applyExamType(views: RemoteViews) {
    views.setTextViewTextSize(R.id.widget_label_next, TypedValue.COMPLEX_UNIT_SP, 10f)
    views.setTextViewTextSize(R.id.widget_time_range, TypedValue.COMPLEX_UNIT_SP, 11f)
    views.setTextViewTextSize(R.id.widget_course_name, TypedValue.COMPLEX_UNIT_SP, 14f)
    views.setTextViewTextSize(R.id.widget_teacher, TypedValue.COMPLEX_UNIT_SP, 10f)
    views.setTextViewTextSize(R.id.widget_room, TypedValue.COMPLEX_UNIT_SP, 10f)
    views.setTextViewTextSize(R.id.widget_seat, TypedValue.COMPLEX_UNIT_SP, 10f)
}

private fun weekdayMondayBased(now: Calendar): Int {
    val dow = now.get(Calendar.DAY_OF_WEEK)
    return if (dow == Calendar.SUNDAY) 7 else dow - 1
}

private fun getMinutes(t: String): Int {
    val parts = t.split(":")
    return parts[0].toInt() * 60 + parts[1].toInt()
}

private fun periodStartMinutes(period: Int): Int {
    val i = max(1, min(period, START_TIMES.size)) - 1
    return getMinutes(START_TIMES[i])
}

private fun periodEndMinutes(period: Int): Int {
    val i = max(1, min(period, END_TIMES.size)) - 1
    return getMinutes(END_TIMES[i])
}

private fun courseMatchesWeek(week: Int, course: JSONObject): Boolean {
    val weeksList = course.optJSONArray("weeksList")
    if (weeksList != null && weeksList.length() > 0) {
        for (i in 0 until weeksList.length()) {
            if (weeksList.optInt(i) == week) return true
        }
        return false
    }
    val weeksObj = course.optJSONObject("weeks")
    val wStart = weeksObj?.optInt("start", 1) ?: 1
    val wEnd = weeksObj?.optInt("end", 1) ?: 1
    if (week < wStart || week > wEnd) return false
    if (course.optBoolean("odd", false) && week % 2 == 0) return false
    if (course.optBoolean("even", false) && week % 2 == 1) return false
    return true
}

private fun scheduleMatchesWeek(week: Int, schedule: JSONObject): Boolean {
    val weeksList = schedule.optJSONArray("weeksList") ?: return true
    if (weeksList.length() == 0) return true
    for (i in 0 until weeksList.length()) {
        if (weeksList.optInt(i) == week) return true
    }
    return false
}

private fun maxWeekFromCourses(coursesArr: JSONArray?): Int {
    if (coursesArr == null || coursesArr.length() == 0) return 1
    var maxW = 1
    for (i in 0 until coursesArr.length()) {
        val c = coursesArr.optJSONObject(i) ?: continue
        val weeksList = c.optJSONArray("weeksList")
        if (weeksList != null && weeksList.length() > 0) {
            for (k in 0 until weeksList.length()) {
                maxW = max(maxW, weeksList.optInt(k))
            }
        } else {
            val weeksObj = c.optJSONObject("weeks")
            maxW = max(maxW, weeksObj?.optInt("end", 1) ?: 1)
        }
    }
    return maxW
}

private fun parseSemesterMonday(startStr: String): Calendar? {
    if (startStr.isEmpty()) return null
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val startDate = sdf.parse(startStr.substring(0, 10)) ?: return null
        val cal = Calendar.getInstance()
        cal.time = startDate
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val startDayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        val offsetToMonday = if (startDayOfWeek == Calendar.SUNDAY) 6 else startDayOfWeek - 2
        cal.add(Calendar.DAY_OF_MONTH, -offsetToMonday)
        cal
    } catch (_: Exception) {
        null
    }
}

private fun parseExamRange(exam: JSONObject): Pair<Long, Long>? {
    val raw = exam.optString("timeRaw", "")
    val startTime = exam.optString("startTime", "")
    val source = if (raw.isNotEmpty()) raw else startTime
    if (source.isEmpty()) return null

    val dateMatch = Regex("(\\d{4})[-/年](\\d{1,2})[-/月](\\d{1,2})").find(source) ?: return null
    val year = dateMatch.groupValues[1].toInt()
    val month = dateMatch.groupValues[2].toInt() - 1
    val day = dateMatch.groupValues[3].toInt()
    val times = Regex("(\\d{1,2}):(\\d{2})").findAll(source).toList()
    if (times.isEmpty()) {
        val cal = Calendar.getInstance()
        cal.set(year, month, day, 0, 0, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return Pair(cal.timeInMillis, cal.timeInMillis + 120L * 60L * 1000L)
    }
    val startH = times[0].groupValues[1].toInt()
    val startM = times[0].groupValues[2].toInt()
    val startCal = Calendar.getInstance()
    startCal.set(year, month, day, startH, startM, 0)
    startCal.set(Calendar.MILLISECOND, 0)
    val endCal = Calendar.getInstance()
    if (times.size >= 2) {
        val endH = times[1].groupValues[1].toInt()
        val endM = times[1].groupValues[2].toInt()
        endCal.set(year, month, day, endH, endM, 0)
        endCal.set(Calendar.MILLISECOND, 0)
    } else {
        endCal.timeInMillis = startCal.timeInMillis + 120L * 60L * 1000L
    }
    return Pair(startCal.timeInMillis, endCal.timeInMillis)
}

private data class LessonSlot(
    val name: String,
    val teacher: String,
    val room: String,
    val startPeriod: Int,
    val endPeriod: Int,
) {
    fun startMinutes(): Int = periodStartMinutes(startPeriod)
    fun endMinutes(): Int = periodEndMinutes(endPeriod)
    fun timeRange(): String {
        val si = max(1, min(startPeriod, START_TIMES.size)) - 1
        val ei = max(1, min(endPeriod, END_TIMES.size)) - 1
        return "${START_TIMES[si]}-${END_TIMES[ei]}"
    }
}

private data class ParsedExam(
    val obj: JSONObject,
    val startMs: Long,
    val endMs: Long,
)
