(() => {
  // Case registry: card keys map to external case-study sources.
  const caseStudies = {
    earthview: {
      title: "Transforming Network Data into Interactive 3D Insights",
      intro: "A smartboard concept that makes global network performance easier to interpret, faster to act on, and more collaborative to use.",
      external: "cases/case_study_earthview.html",
    },
    endpoint: {
      title: "Improving IT Workflows with Better Monitoring",
      intro: "A redesign of the Endpoint Smartboard to reduce cognitive load and help IT teams identify issues faster.",
      external: "cases/case_study_endpoint.html",
    },
    solarwinds: {
      title: "Improving the platform experience for SolarWinds users",
      intro: "A platform modernization focused on navigation clarity, scalable templates, and a durable design system.",
      external: "cases/case_study_solarwinds.html",
    },
    transcat: {
      title: "Modernizing eCommerce workflows for industrial buyers",
      intro: "A full eCommerce overhaul to improve discoverability, navigation, and long‑term scalability.",
      external: "cases/case_study_transcat.html",
    },
  };

  const modal = document.querySelector("#case-modal");
  const modalPanel = modal ? modal.querySelector(".case-modal-panel") : null;
  const modalBody = modal ? modal.querySelector(".case-modal-body") : null;
  const closeButton = modal ? modal.querySelector(".case-modal-close") : null;
  const lightbox = document.querySelector("#lightbox");
  const lightboxImage = lightbox ? lightbox.querySelector("#lightbox-image") : null;
  const lightboxClose = lightbox ? lightbox.querySelector(".lightbox-close") : null;
  let lastFocused = null;
  let lastFocusedLightbox = null;
  // In-memory cache avoids re-fetching case HTML on repeated opens.
  const externalCaseCache = new Map();

  // Keep dialog naming tied to visible case heading for screen readers.
  const syncModalLabel = (key) => {
    if (!modalPanel || !modalBody) return;
    const heading = modalBody.querySelector("h1, h2");
    if (heading) {
      if (!heading.id) heading.id = `case-modal-title-${key}`;
      modalPanel.setAttribute("aria-labelledby", heading.id);
      modalPanel.removeAttribute("aria-label");
      return;
    }
    modalPanel.removeAttribute("aria-labelledby");
    modalPanel.setAttribute("aria-label", "Case study");
  };

  const loadExternalCase = async (key, path) => {
    if (!path) return null;
    const isLocalDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isLocalDev && externalCaseCache.has(key)) return externalCaseCache.get(key);
    try {
      const requestPath = isLocalDev ? `${path}?t=${Date.now()}` : path;
      const response = await fetch(requestPath, { cache: "no-store" });
      if (!response.ok) return null;
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      // Prefer explicit case root; fallback keeps older files compatible.
      const content =
        doc.querySelector(`[data-case-content="${key}"]`) ||
        doc.querySelector("[data-case-content]") ||
        doc.querySelector("article");
      if (!content) return null;
      const base = new URL(path, window.location.href);
      // Rebase relative image paths so case files stay self-contained.
      content.querySelectorAll("img[src]").forEach((img) => {
        const src = img.getAttribute("src");
        if (!src) return;
        img.setAttribute("src", new URL(src, base).href);
      });
      const markup = `<div class="case-flow">${content.innerHTML}</div>`;
      if (!isLocalDev) externalCaseCache.set(key, markup);
      return markup;
    } catch {
      return null;
    }
  };

  const renderCase = async (key) => {
    const data = caseStudies[key];
    if (!data || !modalBody) return false;

    // `file://` mode cannot reliably fetch external HTML, so iframe fallback is required.
    if (data.external && window.location.protocol === "file:") {
      modalBody.innerHTML = `
        <div class="case-flow">
          <iframe
            class="case-inline-frame"
            src="${data.external}"
            title="${data.title}"
            loading="eager"
          ></iframe>
        </div>
      `;
      return true;
    }

    if (data.external) {
      const externalMarkup = await loadExternalCase(key, data.external);
      if (externalMarkup) {
        modalBody.innerHTML = externalMarkup;
        syncModalLabel(key);
        return true;
      }
    }
    // Network or parsing failures fallback to iframe so content still loads.
    modalBody.innerHTML = `
      <div class="case-flow">
        <iframe
          class="case-inline-frame"
          src="${data.external}"
          title="${data.title}"
          loading="eager"
        ></iframe>
      </div>
    `;
    syncModalLabel(key);
    return true;
  };

  const openModal = async (key) => {
    if (!modal || !modalBody) return false;
    modalBody.innerHTML = `
      <div class="case-flow">
        <div class="case-text-wrap">
          <div class="case-block"><p>Loading case study...</p></div>
        </div>
      </div>
    `;
    const rendered = await renderCase(key);
    if (!rendered) return false;
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (closeButton) closeButton.focus();
    // Keep URL in sync so deep links and back/forward navigation work.
    if (location.hash !== `#case-${key}`) {
      history.pushState(null, "", `#case-${key}`);
    }
    return true;
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (modalPanel) {
      modalPanel.removeAttribute("aria-labelledby");
      modalPanel.setAttribute("aria-label", "Case study");
    }
    if (location.hash.startsWith("#case-")) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  };

  const openLightbox = (src, alt) => {
    if (!lightbox || !lightboxImage) return;
    lastFocusedLightbox = document.activeElement;
    lightboxImage.src = src;
    lightboxImage.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.removeAttribute("hidden");
    lightbox.setAttribute("aria-hidden", "false");
    if (lightboxClose) lightboxClose.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("hidden", "");
    lightbox.setAttribute("aria-hidden", "true");
    if (lightboxImage) {
      lightboxImage.src = "";
      lightboxImage.alt = "";
    }
    if (lastFocusedLightbox && lastFocusedLightbox.focus) lastFocusedLightbox.focus();
  };

  const handleKeydown = (event) => {
    // Lightbox owns Escape while open so modal Escape handling does not conflict.
    if (lightbox && lightbox.classList.contains("is-open")) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }
      return;
    }
    if (!modal || !modal.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key === "Tab" && modalPanel) {
      // Trap focus inside the modal for keyboard navigation.
      const focusable = modalPanel.querySelectorAll(
        "a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])"
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  if (modal) {
    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (target && target.closest("[data-close=\"true\"]")) closeModal();
    });
    if (closeButton) closeButton.addEventListener("click", closeModal);
    document.addEventListener("keydown", handleKeydown);
  }

  if (lightbox) {
    lightbox.addEventListener("click", closeLightbox);
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  }

  document.querySelectorAll(".work-link[data-case]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const key = link.getAttribute("data-case");
      if (!key) return;
      const opened = await openModal(key);
      // Direct navigation fallback if modal rendering fails.
      if (!opened && link.href) {
        window.location.href = link.href;
      }
    });
  });

  if (modalBody) {
    modalBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // Only case-media images open the lightbox.
      if (target.tagName.toLowerCase() === "img" && target.closest(".case-media")) {
        openLightbox(target.currentSrc || target.src, target.alt);
      }
    });
  }

  const openFromHash = async () => {
    // Deep-link support: opening /#case-key launches the matching modal.
    if (!location.hash.startsWith("#case-")) return;
    const key = location.hash.replace("#case-", "");
    if (caseStudies[key]) await openModal(key);
  };

  window.addEventListener("popstate", async () => {
    if (location.hash.startsWith("#case-")) {
      await openFromHash();
    } else if (modal && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  openFromHash();

  const cursor = document.querySelector(".cursor");
  if (cursor) {
    // Custom cursor is enhancement-only and only active on pointer-capable devices.
    const moveCursor = (event) => {
      const { clientX, clientY } = event;
      cursor.style.left = `${clientX}px`;
      cursor.style.top = `${clientY}px`;
    };

    const showCursor = () => cursor.classList.add("is-active");
    const hideCursor = () => cursor.classList.remove("is-active");

    const setLinkState = (event) => {
      const target = event.target.closest(
        "a, button, [role=\"button\"], input, textarea, select"
      );
      const isLink = Boolean(target);
      const isFooter = target && target.closest(".site-footer");
      cursor.classList.toggle("is-link", isLink);
      cursor.classList.toggle("is-footer", Boolean(isFooter));
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    window.addEventListener("mousemove", showCursor, { passive: true });
    window.addEventListener("mouseleave", hideCursor);
    window.addEventListener("mouseover", setLinkState);
  }

  // Motion guard: honor reduced-motion and skip if GSAP is unavailable.
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced || typeof gsap === "undefined") {
    return;
  }

  // Enable scroll-based reveal triggers.
  gsap.registerPlugin(ScrollTrigger);

  // Hero intro sequence.
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

  heroTl
    .from(".name-line", {
      yPercent: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.08,
    })
    .from(
      ".nickname",
      { y: 12, opacity: 0, duration: 0.5 },
      "-=0.5"
    )
    .from(
      ".tagline",
      { y: 18, opacity: 0, duration: 0.7 },
      "-=0.35"
    )
    .from(
      ".rule",
      { scaleX: 0, transformOrigin: "left center", duration: 0.6 },
      "-=0.5"
    );

  // Intent: staggered reveal for each work card on scroll.
  gsap.utils.toArray(".work-item").forEach((item) => {
    gsap.from(item, {
      y: 28,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: {
        trigger: item,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    });
  });

  // Intent: gentle reveal for the about portrait.
  gsap.from(".about-photo", {
    y: 40,
    opacity: 0,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".about-bleed",
      start: "top 75%",
      toggleActions: "play none none reverse",
    },
  });

  // Intent: bring in about text after image.
  gsap.from(".about-layout p", {
    y: 20,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".about-layout",
      start: "top 80%",
      toggleActions: "play none none reverse",
    },
  });

  // Intent: subtle footer heading reveal to close the page.
  gsap.from(".footer-heading", {
    y: 16,
    opacity: 0,
    duration: 0.6,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".site-footer",
      start: "top 85%",
      toggleActions: "play none none reverse",
    },
  });
})();
