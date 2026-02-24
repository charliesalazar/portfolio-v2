(() => {
  // Case registry: card keys map to external case-study sources.
  const caseStudies = {
    earthview: {
      title: "Transforming Network Data into Interactive 3D Insights",
      external: "cases/case_study_earthview.html",
    },
    endpoint: {
      title: "Improving IT Workflows with Better Monitoring",
      external: "cases/case_study_endpoint.html",
    },
    solarwinds: {
      title: "Improving the platform experience for SolarWinds users",
      external: "cases/case_study_solarwinds.html",
    },
    transcat: {
      title: "Modernizing eCommerce workflows for industrial buyers",
      external: "cases/case_study_transcat.html",
    },
  };

  const modal = document.querySelector("#case-modal");
  const modalPanel = modal ? modal.querySelector(".case-modal-panel") : null;
  const modalBody = modal ? modal.querySelector(".case-modal-body") : null;
  const closeButton = modal ? modal.querySelector(".case-modal-close") : null;
  const lightbox = document.querySelector("#lightbox");
  const lightboxImage = lightbox ? lightbox.querySelector("#lightbox-image") : null;
  const lightboxCaption = lightbox ? lightbox.querySelector("#lightbox-caption") : null;
  const lightboxClose = lightbox ? lightbox.querySelector(".lightbox-close") : null;
  const lightboxBackdrop = lightbox ? lightbox.querySelector(".lightbox-backdrop") : null;
  let lastFocused = null;
  let lastFocusedLightbox = null;
  const lightboxZoom = {
    scale: 1,
    minScale: 1,
    maxScale: 4,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
  };
  // In-memory cache avoids re-fetching case HTML on repeated opens.
  const externalCaseCache = new Map();

  const isResponsiveRaster = (pathname) =>
    /\.(png|jpe?g)$/i.test(pathname) && !/-640\.(png|jpe?g)$/i.test(pathname);

  const inferSourceWidth = (pathname) => {
    const legacyMatch = pathname.match(/_rw_(\d+)\.(png|jpe?g)$/i);
    if (legacyMatch) return Number(legacyMatch[1]);
    return null;
  };

  const toVariant = (absoluteUrl, width) => {
    const variant = new URL(absoluteUrl.href);
    variant.pathname = variant.pathname.replace(/(\.[a-z0-9]+)$/i, `-${width}$1`);
    return variant;
  };

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
        const absoluteUrl = new URL(src, base);
        img.setAttribute("src", absoluteUrl.href);
      });
      // Mirror old-site behavior: serve responsive image candidates for case thumbnails.
      content.querySelectorAll(".case-media img[src]").forEach((img) => {
        if (img.hasAttribute("srcset")) return;
        const src = img.getAttribute("src");
        if (!src) return;
        const absoluteUrl = new URL(src, base);
        if (!isResponsiveRaster(absoluteUrl.pathname)) return;
        const compactUrl = toVariant(absoluteUrl, 640);
        const mediumUrl = toVariant(absoluteUrl, 960);
        const maxWidth = inferSourceWidth(absoluteUrl.pathname) || 1920;
        const compactWidth = Math.min(640, maxWidth);
        const sourceCandidates = [`${compactUrl.href} ${compactWidth}w`];
        if (maxWidth > compactWidth) {
          const mediumWidth = Math.min(960, maxWidth);
          if (mediumWidth > compactWidth) {
            sourceCandidates.push(`${mediumUrl.href} ${mediumWidth}w`);
          }
          sourceCandidates.push(`${absoluteUrl.href} ${maxWidth}w`);
        }
        img.setAttribute("srcset", sourceCandidates.join(", "));
        img.setAttribute("sizes", "(max-width: 540px) 100vw, (max-width: 768px) 50vw, 100vw");
      });
      const markup = `<div class="case-flow">${content.innerHTML}</div>`;
      if (!isLocalDev) externalCaseCache.set(key, markup);
      return markup;
    } catch {
      return null;
    }
  };

  const hydrateGalleryHoverCaptions = (root) => {
    if (!root) return;
    root.querySelectorAll(".case-gallery-2up .case-media").forEach((figure) => {
      if (!(figure instanceof HTMLElement)) return;
      if (figure.querySelector(".case-hover-caption")) return;
      const img = figure.querySelector("img");
      if (!(img instanceof HTMLElement)) return;
      const figcaption = figure.querySelector("figcaption");
      const captionText =
        (img.getAttribute("data-caption") || "").trim() ||
        (figcaption ? figcaption.textContent || "" : "").trim();
      if (!captionText) return;
      const overlay = document.createElement("div");
      overlay.className = "case-hover-caption";
      overlay.setAttribute("aria-hidden", "true");
      overlay.textContent = captionText;
      figure.appendChild(overlay);
    });
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
        hydrateGalleryHoverCaptions(modalBody);
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

  const renderLightboxTransform = () => {
    if (!lightboxImage) return;
    lightboxImage.style.transform = `translate(${lightboxZoom.offsetX}px, ${lightboxZoom.offsetY}px) scale(${lightboxZoom.scale})`;
    lightboxImage.classList.toggle("is-zoomed", lightboxZoom.scale > 1.01);
  };

  const resetLightboxTransform = () => {
    lightboxZoom.scale = 1;
    lightboxZoom.offsetX = 0;
    lightboxZoom.offsetY = 0;
    lightboxZoom.dragging = false;
    if (lightboxImage) lightboxImage.classList.remove("is-dragging");
    renderLightboxTransform();
  };

  const setLightboxScale = (nextScale, anchorX = 0, anchorY = 0) => {
    if (!lightboxImage) return;
    const prevScale = lightboxZoom.scale;
    const clamped = Math.max(lightboxZoom.minScale, Math.min(lightboxZoom.maxScale, nextScale));
    if (clamped === prevScale) return;
    // Keep the zoom anchored near pointer/double-click point.
    const scaleRatio = clamped / prevScale;
    lightboxZoom.offsetX = (lightboxZoom.offsetX - anchorX) * scaleRatio + anchorX;
    lightboxZoom.offsetY = (lightboxZoom.offsetY - anchorY) * scaleRatio + anchorY;
    lightboxZoom.scale = clamped;
    if (lightboxZoom.scale <= 1.01) {
      lightboxZoom.offsetX = 0;
      lightboxZoom.offsetY = 0;
    }
    renderLightboxTransform();
  };

  const openLightbox = (src, alt, caption) => {
    if (!lightbox || !lightboxImage) return;
    lastFocusedLightbox = document.activeElement;
    lightboxImage.src = src;
    lightboxImage.alt = alt || "";
    if (lightboxCaption) {
      const captionText = caption ? caption.trim() : "";
      lightboxCaption.textContent = captionText;
      if (captionText) {
        lightboxCaption.removeAttribute("hidden");
      } else {
        lightboxCaption.setAttribute("hidden", "");
      }
    }
    lightbox.classList.add("is-open");
    lightbox.removeAttribute("hidden");
    lightbox.setAttribute("aria-hidden", "false");
    resetLightboxTransform();
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
      lightboxImage.classList.remove("is-dragging");
    }
    if (lightboxCaption) {
      lightboxCaption.textContent = "";
      lightboxCaption.setAttribute("hidden", "");
    }
    resetLightboxTransform();
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
    if (lightboxBackdrop) lightboxBackdrop.addEventListener("click", closeLightbox);
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(".lightbox-close")) return;
      if (target.closest("#lightbox-image")) return;
      if (target.closest("#lightbox-caption")) return;
      closeLightbox();
    });
  }

  if (lightboxImage) {
    lightboxImage.addEventListener("dblclick", (event) => {
      event.preventDefault();
      const rect = lightboxImage.getBoundingClientRect();
      const anchorX = event.clientX - (rect.left + rect.width / 2);
      const anchorY = event.clientY - (rect.top + rect.height / 2);
      const next = lightboxZoom.scale > 1.01 ? 1 : 2;
      setLightboxScale(next, anchorX, anchorY);
    });

    lightboxImage.addEventListener(
      "wheel",
      (event) => {
        if (!lightbox || !lightbox.classList.contains("is-open")) return;
        event.preventDefault();
        const rect = lightboxImage.getBoundingClientRect();
        const anchorX = event.clientX - (rect.left + rect.width / 2);
        const anchorY = event.clientY - (rect.top + rect.height / 2);
        const delta = event.deltaY < 0 ? 0.18 : -0.18;
        setLightboxScale(lightboxZoom.scale + delta, anchorX, anchorY);
      },
      { passive: false }
    );

    lightboxImage.addEventListener("pointerdown", (event) => {
      if (lightboxZoom.scale <= 1.01) return;
      lightboxZoom.dragging = true;
      lightboxZoom.startX = event.clientX;
      lightboxZoom.startY = event.clientY;
      lightboxImage.classList.add("is-dragging");
      lightboxImage.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    lightboxImage.addEventListener("pointermove", (event) => {
      if (!lightboxZoom.dragging) return;
      const dx = event.clientX - lightboxZoom.startX;
      const dy = event.clientY - lightboxZoom.startY;
      lightboxZoom.startX = event.clientX;
      lightboxZoom.startY = event.clientY;
      lightboxZoom.offsetX += dx;
      lightboxZoom.offsetY += dy;
      renderLightboxTransform();
      event.preventDefault();
    });

    const stopDragging = (event) => {
      if (!lightboxZoom.dragging) return;
      lightboxZoom.dragging = false;
      lightboxImage.classList.remove("is-dragging");
      if (event && typeof event.pointerId === "number") {
        try {
          lightboxImage.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore capture release errors from non-captured pointers.
        }
      }
    };

    lightboxImage.addEventListener("pointerup", stopDragging);
    lightboxImage.addEventListener("pointercancel", stopDragging);
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
        const figure = target.closest("figure");
        const captionNode = figure ? figure.querySelector("figcaption") : null;
        const captionText = captionNode ? captionNode.textContent : target.getAttribute("data-caption");
        openLightbox(target.currentSrc || target.src, target.alt, captionText);
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
    const cursorOffsetX = 12;
    const cursorOffsetY = -12;
    const highIntentSelector =
      ".work-link, .case-modal-close, .lightbox-close, .footer-links a, .site-footer a";

    const moveCursor = (event) => {
      const { clientX, clientY } = event;
      cursor.style.left = `${clientX + cursorOffsetX}px`;
      cursor.style.top = `${clientY + cursorOffsetY}px`;
    };

    const showCursor = () => cursor.classList.add("is-active");
    const hideCursor = () => cursor.classList.remove("is-active");

    const setLinkState = (event) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest(
        "a, button, [role=\"button\"], input, textarea, select"
      );
      const isLink = Boolean(target);
      const isHighIntent = Boolean(target && target.closest(highIntentSelector));
      cursor.classList.toggle("is-link", isLink);
      cursor.classList.toggle("is-cta", isHighIntent);
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    window.addEventListener("mousemove", showCursor, { passive: true });
    window.addEventListener("mouseleave", hideCursor);
    window.addEventListener("mouseover", setLinkState);
  }

  // Motion guard: skip enhancements when GSAP is unavailable.
  if (typeof gsap === "undefined") {
    return;
  }

  // Enable scroll-based reveal triggers.
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add(
    {
      reduce: "(prefers-reduced-motion: reduce)",
      isDesktop: "(min-width: 721px)",
      isPointerFine: "(pointer: fine)",
    },
    (context) => {
      const { reduce, isDesktop, isPointerFine } = context.conditions;
      if (reduce) return;

      // Split hero name into per-letter spans for a GSAP-style character reveal.
      const heroNameLines = Array.from(document.querySelectorAll(".name-line"));
      let heroNameChars = Array.from(document.querySelectorAll(".name-char"));
      if (!heroNameChars.length) {
        heroNameLines.forEach((line) => {
          if (!(line instanceof HTMLElement)) return;
          const raw = line.textContent || "";
          line.textContent = "";
          Array.from(raw).forEach((char) => {
            const letter = document.createElement("span");
            letter.className = "name-char";
            if (char === " ") {
              letter.classList.add("name-char--space");
              letter.innerHTML = "&nbsp;";
            } else {
              letter.textContent = char;
            }
            line.appendChild(letter);
          });
        });
        heroNameChars = Array.from(document.querySelectorAll(".name-char"));
      }

      // Hero intro sequence with labels for cleaner choreography.
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .addLabel("intro")
        .from(
          heroNameChars,
          {
            yPercent: 115,
            opacity: 0,
            rotate: 2.5,
            duration: 0.95,
            stagger: 0.032,
            ease: "power4.out",
          },
          "intro"
        )
        .addLabel("copyIn", "-=0.45")
        .from(".nickname", { y: 12, opacity: 0, duration: 0.5 }, "copyIn")
        .from(".tagline", { y: 18, opacity: 0, duration: 0.7 }, "copyIn+=0.1")
        .from(
          ".rule",
          { scaleX: 0, transformOrigin: "left center", duration: 0.6 },
          "copyIn+=0.02"
        )
        .addLabel("settle");

      // Keep the hero title subtly "alive" with a gentle breathing loop.
      const heroName = document.querySelector(".name");
      if (heroName) {
        gsap.set(heroName, { transformOrigin: "8% 42%" });
        gsap.to(heroName, {
          scale: isDesktop ? 1.015 : 1.008,
          duration: 3.8,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: 0.25,
        });
      }

      let cleanupHeroPointer = null;
      if (heroName && isDesktop && isPointerFine) {
        // quickTo keeps pointer-driven motion smooth and inexpensive.
        const toX = gsap.quickTo(heroName, "x", { duration: 0.8, ease: "power3.out" });
        const toY = gsap.quickTo(heroName, "y", { duration: 0.8, ease: "power3.out" });
        const toRotateY = gsap.quickTo(heroName, "rotateY", { duration: 0.9, ease: "power3.out" });
        const toRotateX = gsap.quickTo(heroName, "rotateX", { duration: 0.9, ease: "power3.out" });

        const handleMove = (event) => {
          const xNorm = event.clientX / window.innerWidth - 0.5;
          const yNorm = event.clientY / window.innerHeight - 0.5;
          toX(xNorm * 10);
          toY(yNorm * 8);
          toRotateY(xNorm * 3.2);
          toRotateX(yNorm * -2.4);
        };

        const handleLeave = () => {
          toX(0);
          toY(0);
          toRotateY(0);
          toRotateX(0);
        };

        window.addEventListener("mousemove", handleMove, { passive: true });
        window.addEventListener("mouseleave", handleLeave, { passive: true });
        cleanupHeroPointer = () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseleave", handleLeave);
        };
      }

      // Staggered reveal for each work card on scroll.
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

      return () => {
        if (cleanupHeroPointer) cleanupHeroPointer();
      };
    }
  );
})();
