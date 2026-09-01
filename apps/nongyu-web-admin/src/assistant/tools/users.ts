import { tool } from "nongyu-agent-sdk";
import { z } from "zod";
import { fetchAdminUser, listAdminUsers } from "../../lib/adminApi";

export const adminUsersListTool = tool({
  name: "admin_users_list",
  description:
    "按关键词/角色/状态/是否在线分页查询农屿用户列表。查人、搜学号、筛管理员、查当前在线用户时必须调用。只读。",
  inputSchema: z.object({
    keyword: z.string().optional().describe("学号或姓名模糊"),
    role: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .describe("0 普通 1 管理员"),
    status: z
      .union([z.literal(0), z.literal(1)])
      .optional()
      .describe("0 禁用 1 正常"),
    isOnline: z.literal(1).optional().describe("传 1 仅查当前在线（与大屏口径一致）"),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(50).optional(),
  }),
  render: { component: "AdminUserList" },
  execute: async (input) => {
    return listAdminUsers({
      keyword: input.keyword,
      role: input.role,
      status: input.status,
      isOnline: input.isOnline,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  },
});

export const adminUserDetailTool = tool({
  name: "admin_user_detail",
  description: "按用户 id 查询用户详情（档案、在线、设置摘要）。只读，不能改角色或密码。",
  inputSchema: z.object({
    id: z.number().int().positive(),
  }),
  render: { component: "AdminUserDetail" },
  execute: async (input) => fetchAdminUser(input.id),
});
