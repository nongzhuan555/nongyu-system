import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./index.css";
import { antdTheme } from "./theme/antdTheme";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("找不到根节点 #root");
}

/** Vite `base`：开发 `/`，生产 `/admin/` → basename 去掉尾斜杠 */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <BrowserRouter basename={routerBasename === "/" ? undefined : routerBasename}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
);
