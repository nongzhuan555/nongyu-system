import { KeyOutlined } from "@ant-design/icons";
import { Form, Input, Modal, message } from "antd";
import { useState } from "react";
import { AdminApiError, setAdminUserPassword } from "../../lib/adminApi";

type PasswordForm = {
  adminPassword: string;
  confirmPassword: string;
};

type SetAdminPasswordModalProps = {
  open: boolean;
  userId: number | null;
  userLabel?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

/** 为指定管理员设置/重置农屿管理员密码（非自助改密）。 */
export function SetAdminPasswordModal({
  open,
  userId,
  userLabel,
  onClose,
  onSuccess,
}: SetAdminPasswordModalProps) {
  const [form] = Form.useForm<PasswordForm>();
  const [submitting, setSubmitting] = useState(false);

  async function handleOk() {
    if (userId === null) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await setAdminUserPassword(userId, values.adminPassword);
      message.success("管理员密码已更新");
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      const text = err instanceof AdminApiError ? err.serverMessage : "设置失败，请稍后重试";
      message.error(text);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={userLabel ? `设置管理员密码 · ${userLabel}` : "设置管理员密码"}
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => {
        void handleOk();
      }}
      confirmLoading={submitting}
      destroyOnClose
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" requiredMark={false} className="mt-2">
        <Form.Item
          name="adminPassword"
          label="新密码"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 8, message: "密码至少 8 位" },
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={["adminPassword"]}
          rules={[
            { required: true, message: "请再次输入密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("adminPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
        >
          <Input.Password prefix={<KeyOutlined />} autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
