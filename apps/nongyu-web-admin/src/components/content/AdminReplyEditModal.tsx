import { Form, Input, Modal, message } from "antd";
import { useEffect, useState } from "react";
import { AdminApiError, createAdminPostReply, patchAdminPostReply } from "../../lib/adminApi";
import { useModalWidth } from "../../lib/responsive";

type FormValues = { content: string };

type AdminReplyEditModalProps = {
  open: boolean;
  postId: number | null;
  /** 已有回复内容：有值=编辑态；null=创建态 */
  existingContent: string | null;
  onCancel: () => void;
  onSaved: () => void;
};

/**
 * 管理员回复编辑 Modal：创建态遇 409 自动刷新；编辑态遇 404 自动刷新。
 */
export function AdminReplyEditModal({
  open,
  postId,
  existingContent,
  onCancel,
  onSaved,
}: AdminReplyEditModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const modalWidth = useModalWidth(520);
  const isEdit = existingContent !== null;

  useEffect(() => {
    if (!open) return;
    if (existingContent !== null) {
      form.setFieldsValue({ content: existingContent });
    } else {
      form.resetFields();
    }
  }, [open, existingContent, form]);

  async function handleSubmit() {
    if (postId == null) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const content = values.content.trim();
      if (isEdit) {
        await patchAdminPostReply(postId, { content });
        message.success("回复已更新");
      } else {
        await createAdminPostReply(postId, { content });
        message.success("回复已发布");
      }
      onSaved();
      onCancel();
    } catch (err) {
      if (err instanceof AdminApiError) {
        // 40901: 已存在回复（创建态）→ 父刷新后切编辑态
        // 40404: 回复不存在（编辑态）→ 父刷新
        if (err.code === 40901 || err.code === 40404) {
          message.warning(err.serverMessage || "回复状态已变更，已刷新");
          onSaved();
          onCancel();
          return;
        }
        message.error(err.serverMessage);
      } else {
        message.error("保存失败，请稍后重试");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "编辑管理员回复" : "添加管理员回复"}
      open={open}
      width={modalWidth}
      centered
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="content"
          label="回复内容"
          rules={[
            { required: true, message: "请输入回复" },
            { max: 2000, message: "不超过 2000 字" },
            {
              validator: (_, value: string) =>
                value && value.trim().length === 0
                  ? Promise.reject(new Error("回复不能为空白"))
                  : Promise.resolve(),
            },
          ]}
        >
          <Input.TextArea rows={6} maxLength={2000} showCount placeholder="请输入回复内容" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
