import { KeyOutlined } from "@ant-design/icons";
import { Alert, Form, Input, Modal, message } from "antd";
import { useState } from "react";
import { AdminApiError, changeOwnAdminPassword } from "../lib/adminApi";
import { useModalWidth } from "../lib/responsive";

type PasswordForm = {
  adminPassword: string;
  confirmPassword: string;
};

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * 当前管理员自助改密（须已建档，非 bootstrap）
 */
export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [form] = Form.useForm<PasswordForm>();
  const [submitting, setSubmitting] = useState(false);
  const modalWidth = useModalWidth(480);

  async function handleOk() {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await changeOwnAdminPassword(values.adminPassword);
      message.success("密码已更新");
      message.info("出厂默认密码仍可登录", 4);
      form.resetFields();
      onClose();
    } catch (err) {
      const text = err instanceof AdminApiError ? err.serverMessage : "修改失败，请稍后重试";
      message.error(text);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="修改密码"
      open={open}
      width={modalWidth}
      centered
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
      <Alert
        className="mb-4"
        type="info"
        showIcon
        message="修改的是农屿管理员密码，与教务网密码无关。超级管理员出厂默认密码在改密后仍可使用。"
      />
      <Form form={form} layout="vertical" requiredMark={false}>
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
