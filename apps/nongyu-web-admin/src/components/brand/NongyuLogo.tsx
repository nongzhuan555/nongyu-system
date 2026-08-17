type NongyuLogoProps = {
  size?: number;
  className?: string;
  rounded?: boolean;
};

const LOGO_SRC = "/nongyu-logo.png";

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
