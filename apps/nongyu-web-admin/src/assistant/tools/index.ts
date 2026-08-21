import { adminDashboardOverviewTool } from "./dashboard";
import { adminSettingsDistributionTool } from "./dashboard";
import { adminUserDistributionTool } from "./dashboard";
import { adminUserGrowthTool } from "./dashboard";
import {
  adminTrackCrashesTool,
  adminTrackDimsTool,
  adminTrackOverviewTool,
  adminTrackTrendTool,
} from "./track";
import { adminUserDetailTool, adminUsersListTool } from "./users";

export const adminAssistantTools = {
  admin_users_list: adminUsersListTool,
  admin_user_detail: adminUserDetailTool,
  admin_dashboard_overview: adminDashboardOverviewTool,
  admin_user_growth: adminUserGrowthTool,
  admin_user_distribution: adminUserDistributionTool,
  admin_settings_distribution: adminSettingsDistributionTool,
  admin_track_overview: adminTrackOverviewTool,
  admin_track_trend: adminTrackTrendTool,
  admin_track_dims: adminTrackDimsTool,
  admin_track_crashes: adminTrackCrashesTool,
};
