import { siteConfig } from "./site-config";
import "./styles/tokens.css";
import "./styles/site.css";

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
    androidBtn.removeAttribute("aria-disabled");
    androidBtn.classList.remove("btn--disabled");
    androidBtn.textContent = "下载 Android APK";
  } else {
    androidBtn.removeAttribute("href");
    androidBtn.setAttribute("aria-disabled", "true");
    androidBtn.classList.add("btn--disabled");
    androidBtn.textContent = "Android · 即将开放";
    androidBtn.addEventListener("click", (e) => e.preventDefault());
  }
}

const featuresRoot = document.querySelector<HTMLElement>("[data-features]");
if (featuresRoot) {
  featuresRoot.innerHTML = siteConfig.features
    .map((f, index) => {
      const flip = index % 2 === 1 ? " feature--flip" : "";
      const n = String(index + 1).padStart(2, "0");
      return `
<article class="feature${flip} reveal" data-reveal>
  <div class="feature__copy">
    <p class="feature__kicker">${n}</p>
    <h3 class="feature__title">${f.title}</h3>
    <p class="feature__desc">${f.description}</p>
  </div>
  <div class="feature__media">
    <div class="media-frame" data-media-frame data-gif="${f.gifSrc}" data-title="${f.title}">
      <div class="media-placeholder" data-placeholder>
        <span class="media-placeholder__glow" aria-hidden="true"></span>
        <p class="media-placeholder__title">${f.title}</p>
        <p class="media-placeholder__hint">动图占位</p>
      </div>
    </div>
  </div>
</article>`;
    })
    .join("");

  featuresRoot.querySelectorAll<HTMLElement>("[data-media-frame]").forEach((frame) => {
    const src = frame.dataset.gif;
    const title = frame.dataset.title ?? "";
    if (!src) return;
    const img = new Image();
    img.alt = `${title} 功能演示`;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("load", () => {
      frame.querySelector("[data-placeholder]")?.remove();
      frame.appendChild(img);
    });
    img.addEventListener("error", () => {
      /* 保持占位 */
    });
    img.src = `/${src.replace(/^\//, "")}`;
  });
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

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
