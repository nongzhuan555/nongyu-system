export type ConfirmOptions = {
  /** 标题 */
  title: string;
  /** 说明文案 */
  message?: string;
  /** 确认按钮文案，默认「确定」 */
  confirmText?: string;
  /** 取消按钮文案，默认「取消」 */
  cancelText?: string;
  /** 危险操作（确认钮用 danger 色） */
  destructive?: boolean;
};

export type ConfirmRequest = ConfirmOptions & {
  id: number;
  resolve: (value: boolean) => void;
};
