/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 为空则走相对路径 + Vite 代理；直连时填 Node 根地址 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** 未来 WebView 注入口；本刀只回填表单，不自动提交。 */
interface NongyuAdminPrefill {
  studentNo?: string;
  adminPassword?: string;
}

interface Window {
  __NONGYU_ADMIN_PREFILL__?: NongyuAdminPrefill;
  /** App 应用内 WebView 注入的 handoff ticket（读后由登录页清除） */
  __NONGYU_ADMIN_HANDOFF_TICKET__?: string;
}
