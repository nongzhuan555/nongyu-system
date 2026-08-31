type NongyuLogoProps = {
  size?: number;
  className?: string;
  rounded?: boolean;
};

/** 生产 base=/admin/，须相对部署前缀，勿写站点根路径 /nongyu-logo.png */
const LOGO_SRC = `${import.meta.env.BASE_URL}nongyu-logo.png`;

/**
 * 农屿品牌图（与 public/nongyu-logo.png、favicon 同源）
 */
export function NongyuLogo({ size = 40, className = "", rounded = true }: NongyuLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="农屿"
      width={size}
      height={size}
      className={`${rounded ? "rounded-xl" : ""} object-cover ${className}`.trim()}
      draggable={false}
    />
  );
}
