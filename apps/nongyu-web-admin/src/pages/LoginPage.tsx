import { Alert, Button, Checkbox, Form, Input } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { STUDENT_NO_PATTERN } from "../lib/constants";
import { getLoginErrorMessage } from "../lib/loginErrorMessage";
import { resolveLoginType, safeInternalPath } from "../lib/navigation";
import {
  clearRememberedStudentNo,
  readRememberedStudentNo,
  writeRememberedStudentNo,
} from "../lib/storage";
import { useAuthStore } from "../stores/authStore";

type LoginFormValues = {
  studentNo: string;
  adminPassword: string;
  rememberStudentNo: boolean;
};

type LoginLocationState = {
  from?: string;
};

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const loginType = resolveLoginType(location.search);

  useEffect(() => {
    // 未来 WebView 注入口：只回填，不自动提交
    const prefill = window.__NONGYU_ADMIN_PREFILL__;
    if (!prefill) return;
    const patch: Partial<LoginFormValues> = {};
    if (prefill.studentNo) patch.studentNo = prefill.studentNo;
    if (prefill.adminPassword) patch.adminPassword = prefill.adminPassword;
    if (Object.keys(patch).length > 0) {
      form.setFieldsValue(patch);
    }
  }, [form]);

  async function handleFinish(values: LoginFormValues) {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await login({
        studentNo: values.studentNo,
        adminPassword: values.adminPassword,
        loginType,
      });
      if (values.rememberStudentNo) {
        writeRememberedStudentNo(values.studentNo);
      } else {
        clearRememberedStudentNo();
      }
      const from = (location.state as LoginLocationState | null)?.from;
      navigate(safeInternalPath(from), { replace: true });
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="h-[3px] bg-sunlight" />
        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">农屿管理台</h1>
          <p className="mt-2 text-sm text-muted">使用教务网学号与农屿管理员密码进入</p>

          {formError ? <Alert className="mt-6" type="error" showIcon message={formError} /> : null}

          <Form<LoginFormValues>
            className="mt-6"
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              studentNo: readRememberedStudentNo(),
              adminPassword: "",
              rememberStudentNo: true,
            }}
            onFinish={(values) => {
              void handleFinish(values);
            }}
          >
            <Form.Item
              label="教务网学号"
              name="studentNo"
              rules={[
                { required: true, message: "请输入 9 位学号" },
                { pattern: STUDENT_NO_PATTERN, message: "请输入 9 位学号" },
              ]}
            >
              <Input
                autoComplete="username"
                inputMode="numeric"
                maxLength={9}
                placeholder="9 位学号"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="农屿管理员密码"
              name="adminPassword"
              rules={[{ required: true, message: "请输入农屿管理员密码" }]}
            >
              <Input.Password
                autoComplete="current-password"
                placeholder="不是教务网密码"
                size="large"
              />
            </Form.Item>

            <Form.Item name="rememberStudentNo" valuePropName="checked">
              <Checkbox>记住学号</Checkbox>
            </Form.Item>

            <Button
              block
              type="primary"
              htmlType="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? "正在验证管理员身份…" : "进入管理台"}
            </Button>
          </Form>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            管理员密码仅用于本后台，与教务网密码不是同一套
          </p>
        </div>
      </div>
    </div>
  );
}
