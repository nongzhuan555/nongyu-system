import { Button, Descriptions, Drawer, Modal, Space, Spin, Tag, Tooltip, message } from "antd";
import { useEffect, useState } from "react";
import { AdminApiError, fetchAdminUser, patchAdminUser } from "../../lib/adminApi";
import { displayText, formatAdminDateTime, formatBool, formatGender } from "../../lib/format";
import { useDrawerWidth, useIsMd } from "../../lib/responsive";
import type { AdminUserDetail } from "../../types/users";
import { SetAdminPasswordModal } from "./SetAdminPasswordModal";

/** 高于 Drawer 默认 zIndex(1000)，确认框须叠在抽屉之上。 */
const CONFIRM_Z_INDEX = 1100;

type UserDetailDrawerProps = {
  userId: number | null;
  open: boolean;
  currentUserId: number | null;
  canManageRole: boolean;
  onClose: () => void;
  onChanged: () => void;
};

/** 升权 / 降权确认框意图（声明式 Modal，避免静态 Modal.confirm 被 Drawer 遮挡）。 */
type RoleConfirmKind = "promote" | "demote";

function RoleTag({ role }: { role: 0 | 1 | 2 }) {
  if (role === 2) return <Tag color="purple">超级管理员</Tag>;
  if (role === 1) return <Tag color="success">管理员</Tag>;
  return <Tag>普通用户</Tag>;
}

function StatusTag({ status }: { status: 0 | 1 }) {
  return status === 1 ? <Tag color="success">正常</Tag> : <Tag color="warning">禁用</Tag>;
}

export function UserDetailDrawer({
  userId,
  open,
  currentUserId,
  canManageRole,
  onClose,
  onChanged,
}: UserDetailDrawerProps) {
  const drawerWidth = useDrawerWidth(480);
  const isMd = useIsMd();
  const confirmWidth = isMd ? 416 : "calc(100vw - 32px)";
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState<RoleConfirmKind | null>(null);

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
      setRoleConfirm(null);
      return;
    }
    void loadDetail(userId);
  }, [open, userId]);

  const isSelf = detail !== null && currentUserId !== null && detail.id === currentUserId;

  async function applyRolePatch(role: 0 | 1, successText: string) {
    if (!detail) return false;
    setActing(true);
    try {
      await patchAdminUser(detail.id, { role });
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

  function openPromoteConfirm() {
    if (!detail || !canManageRole) return;
    setRoleConfirm("promote");
  }

  function openDemoteConfirm() {
    if (!detail || isSelf || !canManageRole) return;
    setRoleConfirm("demote");
  }

  /** 确认框确定：失败时 reject，避免 Ant Design 在失败后仍关窗。 */
  async function handleRoleConfirmOk() {
    if (!detail || roleConfirm === null) {
      throw new Error("role-confirm-invalid");
    }
    const kind = roleConfirm;
    if (kind === "promote") {
      const ok = await applyRolePatch(1, "已设为管理员");
      if (!ok) throw new Error("role-promote-failed");
      setRoleConfirm(null);
      setPasswordOpen(true);
      return;
    }
    const ok = await applyRolePatch(0, "已取消管理员");
    if (!ok) throw new Error("role-demote-failed");
    setRoleConfirm(null);
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
                {detail.role !== 2 ? (
                  detail.role === 0 ? (
                    <Tooltip title={!canManageRole ? "仅超级管理员可操作" : undefined}>
                      <span>
                        <Button
                          type="primary"
                          loading={acting}
                          disabled={!canManageRole}
                          onClick={openPromoteConfirm}
                        >
                          设为管理员
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={
                        isSelf
                          ? "不能对自己执行此操作"
                          : !canManageRole
                            ? "仅超级管理员可操作"
                            : undefined
                      }
                    >
                      <span>
                        <Button
                          danger
                          disabled={isSelf || !canManageRole || acting}
                          onClick={openDemoteConfirm}
                        >
                          取消管理员
                        </Button>
                      </span>
                    </Tooltip>
                  )
                ) : null}

                {detail.role === 1 || detail.role === 2 ? (
                  <Button onClick={() => setPasswordOpen(true)}>设置管理员密码</Button>
                ) : null}
              </Space>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Modal
        title={roleConfirm === "demote" ? "取消管理员" : "设为管理员"}
        open={roleConfirm !== null}
        width={confirmWidth}
        centered
        zIndex={CONFIRM_Z_INDEX}
        getContainer={() => document.body}
        okText="确定"
        cancelText="取消"
        okButtonProps={roleConfirm === "demote" ? { danger: true } : undefined}
        confirmLoading={acting}
        destroyOnClose
        onCancel={() => {
          if (!acting) setRoleConfirm(null);
        }}
        onOk={() => handleRoleConfirmOk()}
      >
        {roleConfirm === "demote" ? (
          <p>取消管理员后将清空其管理员密码，确定继续？</p>
        ) : detail ? (
          <p>
            确定将 {detail.name}（{detail.studentNo}）设为管理员？
          </p>
        ) : null}
      </Modal>

      <SetAdminPasswordModal
        open={passwordOpen}
        userId={detail?.id ?? null}
        userLabel={detail ? `${detail.name}（${detail.studentNo}）` : undefined}
        onClose={() => setPasswordOpen(false)}
      />
    </>
  );
}
