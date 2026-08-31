import { siteConfig, type FeatureItem } from "./site-config";
import { reportPageView } from "./rum/pageView";
import { initWebVitals } from "./rum/webVitals";
import "./styles/tokens.css";
import "./styles/site.css";

reportPageView();
void initWebVitals();

const yearEl = document.querySelector<HTMLElement>("[data-year]");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const nav = document.querySelector<HTMLElement>("[data-nav]");
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-btn]");
const navLinks = document.querySelector<HTMLElement>("[data-nav-links]");

function setNavScrolled() {
  if (!nav) return;
  nav.classList.toggle("is-scrolled", window.scrollY > 12);
}

setNavScrolled();
window.addEventListener("scroll", setNavScrolled, { passive: true });

menuBtn?.addEventListener("click", () => {
  const open = navLinks?.classList.toggle("is-open");
  menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
});

navLinks?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    menuBtn?.setAttribute("aria-expanded", "false");
  });
});

const androidBtn = document.querySelector<HTMLAnchorElement>("[data-android-download]");
const androidUrl = siteConfig.downloadAndroidUrl.trim();
if (androidBtn) {
  if (androidUrl) {
    androidBtn.href = androidUrl;
    androidBtn.setAttribute("download", "nongyu-android.apk");
    androidBtn.removeAttribute("aria-disabled");
    androidBtn.classList.remove("btn--disabled");
    androidBtn.textContent = "下载 Android APK";
  } else {
    androidBtn.removeAttribute("href");
    androidBtn.removeAttribute("download");
    androidBtn.setAttribute("aria-disabled", "true");
    androidBtn.classList.add("btn--disabled");
    androidBtn.textContent = "Android · 即将开放";
    androidBtn.addEventListener("click", (e) => e.preventDefault());
  }
}

const teamTitle = document.querySelector<HTMLElement>("[data-team-title]");
const teamBody = document.querySelector<HTMLElement>("[data-team-body]");
if (teamTitle) teamTitle.textContent = siteConfig.team.title;
if (teamBody) {
  teamBody.replaceChildren(
    ...siteConfig.team.body.split(/\n+/).map((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      return p;
    }),
  );
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function publicSrc(path: string) {
  return `/${path.replace(/^\//, "")}`;
}

function mountImage(slot: HTMLElement, src: string, alt: string) {
  const placeholder = slot.querySelector("[data-placeholder]");
  const img = document.createElement("img");
  img.alt = alt;
  img.decoding = "async";
  img.draggable = false;

  const reveal = () => {
    placeholder?.remove();
    if (!img.isConnected) slot.appendChild(img);
  };

  img.addEventListener("load", reveal, { once: true });
  img.addEventListener(
    "error",
    () => {
      /* 保持占位；失败时不挂载破图 */
      img.remove();
    },
    { once: true },
  );

  // 先入 DOM 再设 src：避免离屏 Image + loading=lazy 永不触发 load
  slot.appendChild(img);
  img.src = publicSrc(src);
  if (img.complete && img.naturalWidth > 0) reveal();
}

function mountFeatureMedia(featureEl: HTMLElement) {
  if (featureEl.dataset.mediaLoaded === "true") return;
  featureEl.dataset.mediaLoaded = "true";
  featureEl.querySelectorAll<HTMLElement>("[data-media-slot]").forEach((slot) => {
    const src = slot.dataset.src;
    const title = slot.dataset.title ?? "";
    if (!src) return;
    mountImage(slot, src, `${title} 功能截图`);
  });
}

/** 功能区块进视口后加载该区块全部截图（含轮播各 slide），不做 slide 级懒加载 */
function observeFeatureMedia(root: HTMLElement) {
  const features = [...root.querySelectorAll<HTMLElement>(".feature")];
  if (features.length === 0) return;

  const loadVisible = () => {
    const preloadPx = 240;
    const bottom = window.innerHeight + preloadPx;
    for (const feature of features) {
      if (feature.dataset.mediaLoaded === "true") continue;
      const rect = feature.getBoundingClientRect();
      if (rect.top < bottom && rect.bottom > -preloadPx) {
        mountFeatureMedia(feature);
      }
    }
  };

  if (typeof IntersectionObserver === "undefined") {
    features.forEach(mountFeatureMedia);
    return;
  }

  const mediaIo = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        mountFeatureMedia(entry.target as HTMLElement);
        mediaIo.unobserve(entry.target);
      }
    },
    { rootMargin: "240px 0px 240px 0px", threshold: 0.01 },
  );

  for (const feature of features) {
    mediaIo.observe(feature);
  }
  loadVisible();
  window.addEventListener("scroll", loadVisible, { passive: true });
  window.addEventListener("resize", loadVisible, { passive: true });
}

function renderPhoneShell(innerHtml: string) {
  return `
<div class="phone-shell">
  <div class="phone-shell__bezel">
    ${innerHtml}
  </div>
</div>`;
}

function renderSingleMedia(feature: FeatureItem) {
  const src = feature.images[0] ?? "";
  return renderPhoneShell(`
<div class="media-frame" data-media-slot data-src="${src}" data-title="${feature.title}">
  <div class="media-placeholder" data-placeholder>
    <span class="media-placeholder__glow" aria-hidden="true"></span>
    <p class="media-placeholder__title">${feature.title}</p>
    <p class="media-placeholder__hint">图片占位</p>
  </div>
</div>`);
}

function renderCarousel(feature: FeatureItem) {
  const slides = feature.images
    .map(
      (src, i) => `
<div class="carousel__slide" data-media-slot data-src="${src}" data-title="${feature.title}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${feature.images.length}">
  <div class="media-placeholder" data-placeholder>
    <span class="media-placeholder__glow" aria-hidden="true"></span>
    <p class="media-placeholder__title">${feature.title}</p>
    <p class="media-placeholder__hint">图片占位</p>
  </div>
</div>`,
    )
    .join("");

  const dots = feature.images
    .map(
      (_, i) =>
        `<button type="button" class="carousel__dot${i === 0 ? " is-active" : ""}" data-carousel-dot="${i}" aria-label="第 ${i + 1} 张" aria-current="${i === 0 ? "true" : "false"}"></button>`,
    )
    .join("");

  return `
<div class="carousel" data-carousel aria-roledescription="carousel" aria-label="${feature.title} 截图">
  ${renderPhoneShell(`
<div class="carousel__viewport" data-carousel-viewport>
  <div class="carousel__track" data-carousel-track>
    ${slides}
  </div>
</div>`)}
  <div class="carousel__dots" role="tablist" aria-label="${feature.title} 页码">${dots}</div>
</div>`;
}

function bindCarousel(root: HTMLElement) {
  const viewport = root.querySelector<HTMLElement>("[data-carousel-viewport]");
  const track = root.querySelector<HTMLElement>("[data-carousel-track]");
  const dots = [...root.querySelectorAll<HTMLButtonElement>("[data-carousel-dot]")];
  if (!viewport || !track || dots.length === 0) return;

  const count = dots.length;
  let index = 0;
  let pointerId: number | null = null;
  let startX = 0;
  let deltaX = 0;
  let dragging = false;

  const offsetFor = (i: number, drag = 0) => -i * viewport.clientWidth + drag;

  const setIndex = (next: number, animate: boolean) => {
    index = ((next % count) + count) % count;
    if (!animate || reduceMotion) {
      track.style.transition = "none";
    } else {
      track.style.transition = "";
    }
    track.style.transform = `translate3d(${offsetFor(index)}px, 0, 0)`;
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const i = Number(dot.dataset.carouselDot);
      if (Number.isFinite(i)) setIndex(i, true);
    });
  });

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerId = e.pointerId;
    startX = e.clientX;
    deltaX = 0;
    dragging = true;
    track.style.transition = "none";
    viewport.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    deltaX = e.clientX - startX;
    track.style.transform = `translate3d(${offsetFor(index, deltaX)}px, 0, 0)`;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    const width = viewport.clientWidth || 1;
    const threshold = Math.min(72, width * 0.18);
    if (deltaX <= -threshold) setIndex(index + 1, true);
    else if (deltaX >= threshold) setIndex(index - 1, true);
    else setIndex(index, true);
    deltaX = 0;
  };

  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", () => setIndex(index, false), { passive: true });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFeatureCopy(feature: FeatureItem) {
  const points =
    feature.points && feature.points.length > 0
      ? `<ol class="feature__points">
${feature.points
  .map(
    (point) => `  <li class="feature__point">
    <span class="feature__point-label">${escapeHtml(point.label)}</span>
    <span class="feature__point-text">${escapeHtml(point.text)}</span>
  </li>`,
  )
  .join("\n")}
</ol>`
      : "";
  const closing = feature.closing
    ? `<p class="feature__desc feature__desc--closing">${escapeHtml(feature.closing)}</p>`
    : "";
  return `<p class="feature__desc">${escapeHtml(feature.description)}</p>${points}${closing}`;
}

const featuresRoot = document.querySelector<HTMLElement>("[data-features]");
if (featuresRoot) {
  featuresRoot.innerHTML = siteConfig.features
    .map((f, index) => {
      const flip = index % 2 === 1 ? " feature--flip" : "";
      const n = String(index + 1).padStart(2, "0");
      const media = f.images.length > 1 ? renderCarousel(f) : renderSingleMedia(f);
      return `
<article id="feature-${f.id}" class="feature${flip} reveal" data-reveal style="--reveal-delay: ${index * 70}ms">
  <div class="feature__copy">
    <p class="feature__kicker">${n}</p>
    <h3 class="feature__title">${escapeHtml(f.title)}</h3>
    ${renderFeatureCopy(f)}
  </div>
  <div class="feature__media">${media}</div>
</article>`;
    })
    .join("");

  featuresRoot.querySelectorAll<HTMLElement>("[data-carousel]").forEach(bindCarousel);
  observeFeatureMedia(featuresRoot);
}

const toast = document.querySelector<HTMLElement>("[data-toast]");
let toastTimer = 0;

function showToast(message: string) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function copyText(value: string, btn: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(value);
    btn.classList.add("is-done");
    const prev = btn.textContent;
    btn.textContent = "已复制";
    showToast(`已复制：${value}`);
    window.setTimeout(() => {
      btn.classList.remove("is-done");
      btn.textContent = prev;
    }, 1600);
  } catch {
    showToast("复制失败，请手动选择文案");
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.copy ?? "";
    if (!value) return;
    void copyText(value, btn);
  });
});

if (!reduceMotion) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
}
