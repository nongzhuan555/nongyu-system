import { registerToolUI } from "./registry";
import { AdminChartCard, AdminDataTableCard } from "./cards/ChartCards";
import { AdminKpiGroupCard } from "./cards/KpiCard";
import { AdminSqlBlockCard } from "./cards/SqlCard";
import { AdminUserDetailCard, AdminUserListCard } from "./cards/UserCards";

registerToolUI("admin_users_list", AdminUserListCard);
registerToolUI("admin_user_detail", AdminUserDetailCard);
registerToolUI("admin_dashboard_overview", AdminKpiGroupCard);
registerToolUI("admin_user_growth", AdminChartCard);
registerToolUI("admin_user_distribution", AdminChartCard);
registerToolUI("admin_settings_distribution", AdminChartCard);
registerToolUI("admin_track_overview", AdminKpiGroupCard);
registerToolUI("admin_track_trend", AdminChartCard);
registerToolUI("admin_track_dims", AdminChartCard);
registerToolUI("admin_track_crashes", AdminDataTableCard);
registerToolUI("admin_track_sql", AdminSqlBlockCard);
