package expo.modules.nongyuandroidwidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NongyuWidgetModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("NongyuWidget")

        AsyncFunction("notifyChanged") {
            val context =
                appContext.reactContext
                    ?: appContext.currentActivity?.applicationContext
            if (context != null) {
                NongyuWidgetScheduler.requestUpdate(context)
            }
        }
    }
}
