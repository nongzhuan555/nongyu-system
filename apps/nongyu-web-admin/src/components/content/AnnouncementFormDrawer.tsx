import { Button, DatePicker, Drawer, Form, Input, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { AdminApiError, createAdminAnnouncement, patchAdminAnnouncement } from "../../lib/adminApi";
import { useDrawerWidth } from "../../lib/responsive";
import type { AdminPostItem } from "../../types/posts";

type FormValues = {
  subtype: string;
  title: string;
  content: string;
  publishedAt?: Dayjs;
};

type AnnouncementFormDrawerProps = {
  open: boolean;
  editing: AdminPostItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AnnouncementFormDrawer({
  open,
  editing,
  onClose,
  onSaved,
}: AnnouncementFormDrawerProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const drawerWidth = useDrawerWidth(480);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        subtype: editing.subtype,
        title: editing.title,
        content: editing.content,
        publishedAt: editing.publishedAt ? dayjs(editing.publishedAt) : undefined,
      });
    } else {
      form.resetFields();
    }
  }, [open, editing, form]);

  async function handleSubmit() {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const body = {
        subtype: values.subtype.trim(),
        title: values.title.trim(),
        content: values.content.trim(),
        publishedAt: values.publishedAt?.toISOString(),
      };
      if (editing) {
        await patchAdminAnnouncement(editing.id, body);
        message.success("公告已更新");
      } else {
        await createAdminAnnouncement(body);
        message.success("公告已发布");
      }
      onSaved();
      onClose();
    } catch (err) {
      const text = err instanceof AdminApiError ? err.serverMessage : "保存失败，请稍后重试";
      message.error(text);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      title={editing ? "编辑公告" : "发布公告"}
      open={open}
      onClose={onClose}
      width={drawerWidth}
      destroyOnClose
      extra={
        <Button
          type="primary"
          loading={submitting}
          className="min-h-11"
          onClick={() => void handleSubmit()}
        >
          保存
        </Button>
      }
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="subtype"
          label="子类型"
          rules={[
            { required: true, message: "请输入子类型" },
            { max: 32, message: "子类型最多 32 字" },
          ]}
        >
          <Input placeholder="如 system / notice" maxLength={32} />
        </Form.Item>
        <Form.Item
          name="title"
          label="标题"
          rules={[
            { required: true, message: "请输入标题" },
            { max: 200, message: "标题最多 200 字" },
          ]}
        >
          <Input placeholder="公告标题" maxLength={200} />
        </Form.Item>
        <Form.Item name="content" label="正文" rules={[{ required: true, message: "请输入正文" }]}>
          <Input.TextArea rows={8} placeholder="公告正文" />
        </Form.Item>
        <Form.Item name="publishedAt" label="发布时间（可选）">
          <DatePicker showTime className="w-full" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
