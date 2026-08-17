import { Button, Descriptions, Drawer, Modal, Space, Spin, Tag, Tooltip, message } from "antd";
import { useEffect, useState } from "react";
import { AdminApiError, fetchAdminUser, patchAdminUser } from "../../lib/adminApi";
import { displayText, formatAdminDateTime, formatBool, formatGender } from "../../lib/format";
import { useDrawerWidth } from "../../lib/responsive";
import type { AdminUserDetail } from "../../types/users";
import { SetAdminPasswordModal } from "./SetAdminPasswordModal";

type UserDetailDrawerProps = {
  userId: number | null;
  open: boolean;
  currentUserId: number | null;
  onClose: () => void;
  onChanged: () => void;
};

function RoleTag({ role }: { role: 0 | 1 }) {
  return role === 1 ? <Tag color="success">管理员</Tag> : <Tag>普通用户</Tag>;
}

function StatusTag({ status }: { status: 0 | 1 }) {
  return status === 1 ? <Tag color="success">正常</Tag> : <Tag color="warning">禁用</Tag>;
}

export function UserDetailDrawer({
  userId,
  open,
  currentUserId,
  onClose,
  onChanged,
}: UserDetailDrawerProps) {
  const drawerWidth = useDrawerWidth(480);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function loadDetail(id: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUser(id);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      if (err instanceof AdminApiError) {
        setError(
          err.code === 40302
            ? "当前会话无权管理用户，请先在农屿 App 使用该学号登录完成建档。"
            : err.serverMessage,
        );
      } else {
        setError("网络异常，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || userId === null) {
      setDetail(null);
      setError(null);
      return;
    }
    void loadDetail(userId);
  }, [open, userId]);

  const isSelf = detail !== null && currentUserId !== null && detail.id === currentUserId;

  async function applyPatch(body: { role?: 0 | 1; status?: 0 | 1 }, successText: string) {
    if (!detail) return;
    setActing(true);
    try {
      await patchAdminUser(detail.id, body);
      message.success(successText);
      await loadDetail(detail.id);
      onChanged();
      return true;
    } catch (err) {
      const text = err instanceof AdminApiError ? err.serverMessage : "操作失败，请稍后重试";
      message.error(text);
      return false;
    } finally {
      setActing(false);
    }
  }

  function promote() {
    if (!detail) return;
    Modal.confirm({
      title: "设为管理员",
      content: `确定将 ${detail.name}（${detail.studentNo}）设为管理员？`,
      okText: "确定",
      cancelText: "取消",
      onOk: async () => {
        const ok = await applyPatch({ role: 1 }, "已设为管理员");
        if (ok) setPasswordOpen(true);
      },
    });
  }

  function demote() {
    if (!detail || isSelf) return;
    Modal.confirm({
      title: "取消管理员",
      content: "取消管理员后将清空其管理员密码，确定继续？",
      okText: "确定",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await applyPatch({ role: 0 }, "已取消管理员");
      },
    });
  }

  function disableUser() {
    if (!detail || isSelf) return;
    Modal.confirm({
      title: "禁用用户",
      content: "禁用后该用户无法登录 App，确定继续？",
      okText: "确定",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await applyPatch({ status: 0 }, "已禁用");
      },
    });
  }

  async function enableUser() {
    if (!detail) return;
    await applyPatch({ status: 1 }, "已启用");
  }

  return (
    <>
      <Drawer
        title="用户详情"
        width={drawerWidth}
        open={open}
        onClose={onClose}
        destroyOnClose
        styles={{ body: { paddingBottom: "max(24px, env(safe-area-inset-bottom))" } }}
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            {userId !== null ? (
              <Button
                onClick={() => {
                  void loadDetail(userId);
                }}
              >
                重试
              </Button>
            ) : null}
          </div>
        ) : null}

        {!loading && detail ? (
          <div className="space-y-6">
            <Descriptions column={1} size="small" title="基本信息">
              <Descriptions.Item label="学号">{detail.studentNo}</Descriptions.Item>
              <Descriptions.Item label="姓名">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="角色">
                <RoleTag role={detail.role} />
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <StatusTag status={detail.status} />
              </Descriptions.Item>
              <Descriptions.Item label="在线">
                {detail.isOnline ? "在线" : "离线"}
              </Descriptions.Item>
              <Descriptions.Item label="最近活跃">
                {formatAdminDateTime(detail.lastActiveAt)}
              </Descriptions.Item>
              <Descriptions.Item label="最近登录">
                {formatAdminDateTime(detail.lastLoginAt)}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {formatAdminDateTime(detail.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions column={1} size="small" title="档案">
              <Descriptions.Item label="专业">{displayText(detail.major)}</Descriptions.Item>
              <Descriptions.Item label="学院">{displayText(detail.college)}</Descriptions.Item>
              <Descriptions.Item label="班级">{displayText(detail.className)}</Descriptions.Item>
              <Descriptions.Item label="年级">{displayText(detail.grade)}</Descriptions.Item>
              <Descriptions.Item label="性别">{formatGender(detail.gender)}</Descriptions.Item>
              <Descriptions.Item label="家乡">{displayText(detail.hometown)}</Descriptions.Item>
              <Descriptions.Item label="校区">{displayText(detail.campus)}</Descriptions.Item>
              <Descriptions.Item label="QQ">{displayText(detail.qq)}</Descriptions.Item>
            </Descriptions>

            <Descriptions column={1} size="small" title="设备">
              <Descriptions.Item label="品牌">{displayText(detail.deviceBrand)}</Descriptions.Item>
              <Descriptions.Item label="型号">{displayText(detail.deviceModel)}</Descriptions.Item>
              <Descriptions.Item label="系统">{displayText(detail.deviceOs)}</Descriptions.Item>
              <Descriptions.Item label="设备 ID">
                {displayText(detail.currentDeviceId)}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions column={1} size="small" title="设置摘要">
              <Descriptions.Item label="主题">
                {displayText(detail.settings.theme)}
              </Descriptions.Item>
              <Descriptions.Item label="首屏课表">
                {formatBool(detail.settings.homeIsTimetable)}
              </Descriptions.Item>
              <Descriptions.Item label="应用内打开网页">
                {formatBool(detail.settings.openWebInApp)}
              </Descriptions.Item>
              <Descriptions.Item label="Agent">
                {formatBool(detail.settings.agentEnabled)}
              </Descriptions.Item>
              <Descriptions.Item label="高亮今日列">
                {formatBool(detail.settings.highlightTodayColumn)}
              </Descriptions.Item>
              <Descriptions.Item label="课表配色">
                {displayText(detail.settings.courseCardColorMode)}
              </Descriptions.Item>
              <Descriptions.Item label="学期开始">
                {displayText(detail.settings.semesterStartDate)}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <p className="mb-3 text-sm font-medium text-ink">操作</p>
              <Space wrap>
                {detail.role === 0 ? (
                  <Button type="primary" loading={acting} onClick={promote}>
                    设为管理员
                  </Button>
                ) : (
                  <Tooltip title={isSelf ? "不能对自己执行此操作" : undefined}>
                    <Button danger disabled={isSelf || acting} onClick={demote}>
                      取消管理员
                    </Button>
                  </Tooltip>
                )}

                {detail.status === 1 ? (
                  <Tooltip title={isSelf ? "不能对自己执行此操作" : undefined}>
                    <Button danger disabled={isSelf || acting} onClick={disableUser}>
                      禁用
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    loading={acting}
                    onClick={() => {
                      void enableUser();
                    }}
                  >
                    启用
                  </Button>
                )}

                {detail.role === 1 ? (
                  <Button onClick={() => setPasswordOpen(true)}>设置管理员密码</Button>
                ) : null}
              </Space>
            </div>
          </div>
        ) : null}
      </Drawer>

      <SetAdminPasswordModal
        open={passwordOpen}
        userId={detail?.id ?? null}
        userLabel={detail ? `${detail.name}（${detail.studentNo}）` : undefined}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  );
}
