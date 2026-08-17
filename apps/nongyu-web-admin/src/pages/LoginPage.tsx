import { Alert, Button, Checkbox, Form, Input, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { STUDENT_NO_PATTERN } from "../lib/constants";
import { getHandoffErrorMessage, getLoginErrorMessage } from "../lib/loginErrorMessage";
import { resolveLoginType, safeInternalPath } from "../lib/navigation";
import {
  clearRememberedStudentNo,
  readRememberedStudentNo,
  writeRememberedStudentNo,
} from "../lib/storage";
import { NongyuLogo } from "../components/brand/NongyuLogo";
import { useAuthStore } from "../stores/authStore";

type LoginFormValues = {
  studentNo: string;
  adminPassword: string;
  rememberStudentNo: boolean;
};

type LoginLocationState = {
  from?: string;
};

/**
 * 从 search 去掉 ticket，保留其它查询参数
 */
function searchWithoutTicket(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("ticket");
  const next = params.toString();
  return next ? `?${next}` : "";
}

/**
 * 读取 App WebView 注入的 handoff ticket（不删除）
 */
function peekInjectedHandoffTicket(): string {
  const raw = window.__NONGYU_ADMIN_HANDOFF_TICKET__;
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * 清除注入 ticket，避免同页重复兑换
 */
function clearInjectedHandoffTicket(): void {
  try {
    delete window.__NONGYU_ADMIN_HANDOFF_TICKET__;
  } catch {
    window.__NONGYU_ADMIN_HANDOFF_TICKET__ = undefined;
  }
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handoffTriedRef = useRef(false);
  const login = useAuthStore((state) => state.login);
  const loginWithHandoff = useAuthStore((state) => state.loginWithHandoff);
  const navigate = useNavigate();
  const location = useLocation();
  const loginType = resolveLoginType(location.search);

  /** 仅认注入 ticket；URL query ticket 忽略（防外链盗用） */
  const ticketRef = useRef<string | null>(null);
  if (ticketRef.current === null) {
    ticketRef.current = peekInjectedHandoffTicket();
  }
  const ticket = ticketRef.current;
  const shouldAutoHandoff = loginType === "in_app" && ticket.length > 0;
  const [handoffLoading, setHandoffLoading] = useState(shouldAutoHandoff);

  useEffect(() => {
    // 密码预填口：只回填，不自动提交
    const prefill = window.__NONGYU_ADMIN_PREFILL__;
    if (!prefill) return;
    const patch: Partial<LoginFormValues> = {};
    if (prefill.studentNo) patch.studentNo = prefill.studentNo;
    if (prefill.adminPassword) patch.adminPassword = prefill.adminPassword;
    if (Object.keys(patch).length > 0) {
      form.setFieldsValue(patch);
    }
  }, [form]);

  // 旧链接若仍带 ticket query：从地址栏去掉，绝不据此免登
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("ticket")) return;
    navigate(
      { pathname: location.pathname, search: searchWithoutTicket(location.search) },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!shouldAutoHandoff || handoffTriedRef.current) return;
    handoffTriedRef.current = true;

    let cancelled = false;
    setHandoffLoading(true);
    setFormError(null);
    clearInjectedHandoffTicket();

    void (async () => {
      try {
        await loginWithHandoff(ticket);
        // 成功必跳转：避免 StrictMode 二次 effect 取消后停在登录页
        const from = (location.state as LoginLocationState | null)?.from;
        navigate(
          {
            pathname: safeInternalPath(from),
            search: searchWithoutTicket(location.search),
          },
          { replace: true },
        );
      } catch (error) {
        if (cancelled) return;
        if (useAuthStore.getState().isAuthenticated) {
          navigate(
            {
              pathname: safeInternalPath((location.state as LoginLocationState | null)?.from),
              search: searchWithoutTicket(location.search),
            },
            { replace: true },
          );
          return;
        }
        setFormError(getHandoffErrorMessage(error));
        navigate(
          { pathname: location.pathname, search: searchWithoutTicket(location.search) },
          { replace: true },
        );
      } finally {
        if (!cancelled) setHandoffLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    shouldAutoHandoff,
    ticket,
    loginWithHandoff,
    navigate,
    location.state,
    location.pathname,
    location.search,
  ]);

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

  if (handoffLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-4">
        <Spin size="large" />
        <p className="text-sm text-muted">正在从 App 进入管理台…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-canvas px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-muted/80 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-brand-mist/40 blur-2xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-panel">
        <div className="flex">
          <div className="w-1.5 shrink-0 bg-brand" aria-hidden />
          <div className="min-w-0 flex-1 p-6 md:p-7">
            <div className="flex items-center gap-3">
              <NongyuLogo size={48} className="shrink-0 shadow-sm" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                  Nongyu Admin
                </p>
                <h1 className="mt-1 text-[24px] font-semibold leading-8 tracking-tight text-ink">
                  农屿管理台
                </h1>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-muted">
              使用教务网学号与农屿管理员密码进入
            </p>

            {formError ? (
              <Alert className="mt-5" type="error" showIcon message={formError} />
            ) : null}

            <Form<LoginFormValues>
              className="mt-5"
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
                />
              </Form.Item>

              <Form.Item
                label="农屿管理员密码"
                name="adminPassword"
                rules={[{ required: true, message: "请输入农屿管理员密码" }]}
              >
                <Input.Password autoComplete="current-password" placeholder="不是教务网密码" />
              </Form.Item>

              <Form.Item name="rememberStudentNo" valuePropName="checked" className="mb-4">
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

            <p className="mt-5 text-center text-[12px] leading-5 text-muted">
              管理员密码仅用于本后台，与教务网密码不是同一套
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
