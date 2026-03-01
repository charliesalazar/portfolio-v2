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
  const modalBackdrop = modal ? modal.querySelector(".case-modal-backdrop") : null;
  const lightbox = document.querySelector("#lightbox");
  const lightboxImage = lightbox ? lightbox.querySelector("#lightbox-image") : null;
  const lightboxCaption = lightbox ? lightbox.querySelector("#lightbox-caption") : null;
  const lightboxClose = lightbox ? lightbox.querySelector(".lightbox-close") : null;
  const lightboxBackdrop = lightbox ? lightbox.querySelector(".lightbox-backdrop") : null;
  const bootBlack = document.querySelector(".boot-black");
  const pageRoot = document.querySelector(".page");
  const bootStartsHidden = pageRoot instanceof HTMLElement && pageRoot.classList.contains("boot-hidden");
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  const forceScrollTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
  };
  window.addEventListener("load", forceScrollTop, { once: true });
  window.addEventListener("pageshow", forceScrollTop);
  const setIntroScrollLock = (isLocked) => {
    document.body.classList.toggle("intro-scroll-lock", Boolean(isLocked));
  };
  if (bootStartsHidden) {
    setIntroScrollLock(true);
    window.scrollTo(0, 0);
  }
  const cursor = document.querySelector(".cursor");
  const introOverlay = document.querySelector(".intro-columns");
  const introPov = introOverlay ? introOverlay.querySelector(".intro-pov") : null;
  const introTray = introOverlay ? introOverlay.querySelector(".intro-tray") : null;
  const introSeedDie = introOverlay ? introOverlay.querySelector(".intro-die") : null;
  const hasIntroMarkup =
    introOverlay instanceof HTMLElement &&
    introPov instanceof HTMLElement &&
    introTray instanceof HTMLElement &&
    introSeedDie instanceof HTMLElement;
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
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeCaseSource = null;
  let modalTransitionState = "idle";
  let activeFadeTargets = [];
  let cleanupModalMediaReveal = () => {};
  let fallbackHeroStarted = false;
  let syncCursorSuppression = () => {};
  const revealBootPage = () => {
    if (!(pageRoot instanceof HTMLElement)) return;
    pageRoot.classList.remove("boot-hidden");
    if (typeof gsap !== "undefined") {
      gsap.set(pageRoot, { clearProps: "opacity,visibility" });
      return;
    }
    pageRoot.style.opacity = "";
    pageRoot.style.visibility = "";
  };

  const startCssHeroFallback = () => {
    if (!bootStartsHidden || fallbackHeroStarted) return;
    fallbackHeroStarted = true;
    document.body.classList.add("css-hero-fallback");
    window.setTimeout(() => {
      document.body.classList.remove("css-hero-fallback");
    }, 2400);
  };

  if (bootStartsHidden) {
    const emergencyRevealBoot = () => {
      if (!(pageRoot instanceof HTMLElement) || !pageRoot.classList.contains("boot-hidden")) return;
      revealBootPage();
      startCssHeroFallback();
      setIntroScrollLock(false);
      if (bootBlack instanceof HTMLElement) {
        bootBlack.style.display = "none";
      }
    };
    // Runtime fail-safe for mobile browsers/CDN hiccups: never stay black forever.
    const failSafeDelay = hasIntroMarkup ? 8000 : 3200;
    window.setTimeout(emergencyRevealBoot, failSafeDelay);
    window.addEventListener("error", emergencyRevealBoot, { once: true });
    window.addEventListener("unhandledrejection", emergencyRevealBoot, { once: true });
  }

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
      primeModalMediaRevealState();
      return true;
    }

    if (data.external) {
      const externalMarkup = await loadExternalCase(key, data.external);
      if (externalMarkup) {
        modalBody.innerHTML = externalMarkup;
        hydrateGalleryHoverCaptions(modalBody);
        primeModalMediaRevealState();
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
    primeModalMediaRevealState();
    syncModalLabel(key);
    return true;
  };

  const canAnimateModalTransition = () =>
    typeof gsap !== "undefined" &&
    !prefersReducedMotion &&
    modal &&
    modalPanel &&
    modalBackdrop;

  const getModalMediaTargets = () => {
    if (!modalBody) return [];
    return Array.from(modalBody.querySelectorAll(".case-media img, .case-inline-frame")).filter(
      (el) => el instanceof HTMLElement
    );
  };

  const canUseModalMediaScrollReveal = () =>
    typeof gsap !== "undefined" &&
    !prefersReducedMotion &&
    typeof IntersectionObserver !== "undefined" &&
    modalPanel instanceof HTMLElement;

  const primeModalMediaRevealState = () => {
    const mediaTargets = getModalMediaTargets();
    if (!mediaTargets.length || typeof gsap === "undefined") return;
    gsap.killTweensOf(mediaTargets);
    if (!canUseModalMediaScrollReveal()) {
      gsap.set(mediaTargets, { clearProps: "opacity,filter,transform" });
      return;
    }
    // Prime hidden state before modal is shown to prevent first-frame flash.
    gsap.set(mediaTargets, { opacity: 0, filter: "blur(12px)", y: 14 });
  };

  const setupModalMediaScrollReveal = () => {
    cleanupModalMediaReveal();
    const mediaTargets = getModalMediaTargets();
    if (!mediaTargets.length) return;
    const clearMediaProps = () => {
      if (typeof gsap === "undefined") return;
      gsap.killTweensOf(mediaTargets);
      gsap.set(mediaTargets, { clearProps: "opacity,filter,transform" });
    };

    if (!canUseModalMediaScrollReveal()) {
      clearMediaProps();
      cleanupModalMediaReveal = () => {};
      return;
    }

    const revealedNodes = new WeakSet();
    let observer = null;
    const revealNode = (node, delay = 0) => {
      if (!(node instanceof HTMLElement) || revealedNodes.has(node)) return;
      revealedNodes.add(node);
      gsap.to(node, {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.56,
        ease: "power2.out",
        delay,
        clearProps: "opacity,filter,transform",
      });
      if (observer) observer.unobserve(node);
    };

    gsap.killTweensOf(mediaTargets);

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top
          );
        visible.forEach((entry, index) => {
          revealNode(entry.target, index * 0.05);
        });
      },
      {
        root: modalPanel,
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    mediaTargets.forEach((node) => observer.observe(node));
    cleanupModalMediaReveal = () => {
      observer.disconnect();
      clearMediaProps();
    };
  };

  const introRots = [
    { ry: 270, a: 0.5 },
    { ry: 0, a: 0.9 },
    { ry: 90, a: 0.45 },
    { ry: 180, a: 0.06 },
  ];

  const introFaceColor = (rowIndex, rows, alpha) => {
    const hue = 150 + (rowIndex / Math.max(1, rows)) * 58;
    const light = Math.max(0, Math.min(100, alpha * 100));
    return `hsl(${hue}, 78%, ${light}%)`;
  };

  const buildIntroColumns = () => {
    if (!(introTray instanceof HTMLElement) || !(introSeedDie instanceof HTMLElement)) {
      return { rows: 0, dice: [], cubes: [] };
    }
    const rows = window.matchMedia("(max-width: 900px)").matches ? 14 : 19;
    const existing = Array.from(introTray.querySelectorAll(".intro-die"));
    existing.slice(1).forEach((die) => die.remove());
    for (let i = 1; i < rows; i += 1) {
      introTray.appendChild(introSeedDie.cloneNode(true));
    }
    const dice = Array.from(introTray.querySelectorAll(".intro-die")).filter(
      (die) => die instanceof HTMLElement
    );
    const cubes = dice
      .map((die) => die.querySelector(".intro-cube"))
      .filter((cube) => cube instanceof HTMLElement);
    const stackHeight = rows * 56;
    gsap.set(introTray, { height: stackHeight });
    if (introPov instanceof HTMLElement) {
      gsap.set(introPov, { scale: window.innerHeight / stackHeight });
    }
    return { rows, dice, cubes };
  };

  const animateModalOpen = (sourceEl) =>
    new Promise((resolve) => {
      if (!canAnimateModalTransition()) {
        resolve();
        return;
      }
      if (!(sourceEl instanceof HTMLElement) || !modalPanel || !modalBackdrop) {
        resolve();
        return;
      }

      const sourceRect = sourceEl.getBoundingClientRect();
      if (modalPanel) modalPanel.scrollTop = 0;
      if (modalBody) modalBody.scrollTop = 0;
      const targetRect = modalPanel.getBoundingClientRect();
      const fromScaleX = Math.max(0.15, sourceRect.width / Math.max(1, targetRect.width));
      const fromScaleY = Math.max(0.15, sourceRect.height / Math.max(1, targetRect.height));
      const fromX = sourceRect.left - targetRect.left;
      const fromY = sourceRect.top - targetRect.top;
      const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
      const shellDuration = isMobileViewport ? 0.5 : 0.56;
      const sourceRadius = getComputedStyle(sourceEl).borderRadius || "16px";
      const ghostToX = targetRect.left - sourceRect.left;
      const ghostToY = targetRect.top - sourceRect.top;
      const ghostToScaleX = Math.max(0.15, targetRect.width / Math.max(1, sourceRect.width));
      const ghostToScaleY = Math.max(0.15, targetRect.height / Math.max(1, sourceRect.height));
      activeFadeTargets = [];

      let transitionGhost = null;
      const cleanupGhost = () => {
        if (transitionGhost && transitionGhost.parentNode) {
          transitionGhost.parentNode.removeChild(transitionGhost);
        }
        transitionGhost = null;
        gsap.set(sourceEl, { clearProps: "visibility" });
      };

      modal.classList.add("is-transitioning");
      gsap.set(sourceEl, { visibility: "hidden" });

      transitionGhost = sourceEl.cloneNode(true);
      if (transitionGhost instanceof HTMLElement) {
        transitionGhost.classList.add("modal-transition-ghost", "modal-transition-ghost--card");
        transitionGhost.setAttribute("aria-hidden", "true");
        transitionGhost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        transitionGhost
          .querySelectorAll("a, button, input, select, textarea, [tabindex]")
          .forEach((el) => el.setAttribute("tabindex", "-1"));
        document.body.appendChild(transitionGhost);
        gsap.set(transitionGhost, {
          x: sourceRect.left,
          y: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
          opacity: 1,
          transformOrigin: "top left",
          borderRadius: sourceRadius,
          overflow: "hidden",
        });
      }

      gsap.set(modalBackdrop, { opacity: 0 });
      gsap.set(modalPanel, {
        opacity: 0,
        x: fromX,
        y: fromY,
        scaleX: fromScaleX,
        scaleY: fromScaleY,
        transformOrigin: "top left",
        borderRadius: sourceRadius,
        overflow: "hidden",
      });
      if (modalBody) gsap.set(modalBody, { opacity: 0, filter: "blur(8px)" });
      if (closeButton) gsap.set(closeButton, { opacity: 0, filter: "blur(8px)" });

      let animationSettled = false;
      const cleanupAndResolve = () => {
        if (animationSettled) return;
        animationSettled = true;
        cleanupGhost();
        gsap.set(modalPanel, {
          clearProps: "opacity,transform,borderRadius,x,y,scaleX,scaleY,transformOrigin,overflow",
        });
        gsap.set(modalBackdrop, { clearProps: "opacity" });
        if (modalBody) gsap.set(modalBody, { clearProps: "opacity,filter" });
        if (closeButton) gsap.set(closeButton, { clearProps: "opacity,filter" });
        modal.classList.remove("is-transitioning");
        resolve();
      };

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: cleanupAndResolve,
        onInterrupt: cleanupAndResolve,
      });

      timeline
        .to(modalBackdrop, { opacity: 1, duration: 0.24, ease: "power2.out" }, 0)
        .to(modalPanel, { opacity: 1, duration: 0.16, ease: "power1.out" }, 0.06)
        .to(
          modalPanel,
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            borderRadius: 0,
            duration: shellDuration,
            ease: "power3.inOut",
          },
          0
        );

      if (transitionGhost instanceof HTMLElement) {
        timeline
          .to(
            transitionGhost,
            {
              x: ghostToX,
              y: ghostToY,
              scaleX: ghostToScaleX,
              scaleY: ghostToScaleY,
              borderRadius: 0,
              duration: shellDuration * 0.9,
              ease: "power3.inOut",
            },
            0
          )
          .to(transitionGhost, { opacity: 0, duration: 0.2, ease: "power2.out" }, 0.12);
      }

      if (modalBody) {
        timeline.to(
          modalBody,
          {
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.28,
            ease: "power2.out",
          },
          isMobileViewport ? 0.24 : 0.28
        );
      }
      if (closeButton) {
        timeline.to(
          closeButton,
          {
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.22,
            ease: "power2.out",
          },
          isMobileViewport ? 0.24 : 0.28
        );
      }
    });

  const animateModalClose = () =>
    new Promise((resolve) => {
      if (!canAnimateModalTransition()) {
        resolve();
        return;
      }
      if (!modalPanel || !modalBackdrop) {
        resolve();
        return;
      }

      const fadeTargets = activeFadeTargets;
      const canAnimateToCard = activeCaseSource instanceof HTMLElement && activeCaseSource.isConnected;
      const sourceRect = canAnimateToCard ? activeCaseSource.getBoundingClientRect() : null;

      modal.classList.add("is-transitioning");

      const timeline = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: () => {
          gsap.set(modalPanel, {
            clearProps: "opacity,transform,borderRadius,x,y,scaleX,scaleY,transformOrigin,overflow",
          });
          if (modalBody) gsap.set(modalBody, { clearProps: "opacity,filter" });
          if (closeButton) gsap.set(closeButton, { clearProps: "opacity,filter" });
          gsap.set(modalBackdrop, { clearProps: "opacity" });
          gsap.set(fadeTargets, { clearProps: "opacity,filter" });
          modal.classList.remove("is-transitioning");
          resolve();
        },
      });

      if (canAnimateToCard && sourceRect) {
        const panelRect = modalPanel.getBoundingClientRect();
        const toScaleX = Math.max(0.15, sourceRect.width / Math.max(1, panelRect.width));
        const toScaleY = Math.max(0.15, sourceRect.height / Math.max(1, panelRect.height));
        const toX = sourceRect.left - panelRect.left;
        const toY = sourceRect.top - panelRect.top;
        const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
        const shellDuration = isMobileViewport ? 0.44 : 0.5;
        const sourceRadius =
          activeCaseSource instanceof HTMLElement
            ? getComputedStyle(activeCaseSource).borderRadius || "16px"
            : "16px";
        gsap.set(modalPanel, { transformOrigin: "top left", overflow: "hidden" });

        if (modalBody) {
          timeline.to(
            modalBody,
            {
              opacity: 0,
              filter: "blur(10px)",
              duration: 0.14,
              ease: "power2.out",
            },
            0
          );
        }
        if (closeButton) {
          timeline.to(
            closeButton,
            {
              opacity: 0,
              filter: "blur(10px)",
              duration: 0.12,
              ease: "power2.out",
            },
            0
          );
        }
        timeline.to(modalBackdrop, { opacity: 0, duration: shellDuration, ease: "power2.out" }, 0);
        timeline.to(
          modalPanel,
          {
            x: toX,
            y: toY,
            scaleX: toScaleX,
            scaleY: toScaleY,
            borderRadius: sourceRadius,
            duration: shellDuration,
            ease: "power3.inOut",
          },
          0
        );
      } else {
        timeline.to(modalPanel, { opacity: 0, y: 10, duration: 0.22 }, 0);
        timeline.to(modalBackdrop, { opacity: 0, duration: 0.24 }, 0);
      }
    });

  const openModal = async (key, sourceEl = null) => {
    if (!modal || !modalBody) return false;
    if (modalTransitionState !== "idle") return false;
    cleanupModalMediaReveal();
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
    activeCaseSource = sourceEl instanceof HTMLElement ? sourceEl : null;
    modal.classList.add("is-open");
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    syncCursorSuppression();

    const canAnimateFromCard =
      canAnimateModalTransition() &&
      activeCaseSource instanceof HTMLElement &&
      activeCaseSource.isConnected;
    if (canAnimateFromCard) {
      modalTransitionState = "opening";
      await animateModalOpen(activeCaseSource);
      modalTransitionState = "idle";
    }

    setupModalMediaScrollReveal();

    if (closeButton) closeButton.focus();
    // Keep URL in sync so deep links and back/forward navigation work.
    if (location.hash !== `#case-${key}`) {
      history.pushState(null, "", `#case-${key}`);
    }
    return true;
  };

  const closeModal = async () => {
    if (!modal) return;
    if (modalTransitionState !== "idle") return;
    cleanupModalMediaReveal();

    const canAnimateCloseFade = canAnimateModalTransition();
    if (canAnimateCloseFade) {
      modalTransitionState = "closing";
      modal.classList.add("is-transitioning");
      await new Promise((resolve) => {
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => {
            if (modalPanel) {
              gsap.set(modalPanel, {
                clearProps: "opacity,transform,borderRadius,x,y,scaleX,scaleY,transformOrigin,overflow",
              });
            }
            if (modalBody) gsap.set(modalBody, { clearProps: "opacity,filter" });
            if (closeButton) gsap.set(closeButton, { clearProps: "opacity,filter" });
            if (modalBackdrop) gsap.set(modalBackdrop, { clearProps: "opacity" });
            modal.classList.remove("is-transitioning");
            resolve();
          },
        });
        if (modalBody) {
          tl.to(modalBody, { opacity: 0, filter: "blur(6px)", duration: 0.14 }, 0);
        }
        if (closeButton) {
          tl.to(closeButton, { opacity: 0, filter: "blur(6px)", duration: 0.12 }, 0);
        }
        if (modalPanel) {
          tl.to(modalPanel, { opacity: 0, duration: 0.2 }, 0.02);
        }
        if (modalBackdrop) {
          tl.to(modalBackdrop, { opacity: 0, duration: 0.22 }, 0);
        }
      });
      modalTransitionState = "idle";
    } else {
      if (modalPanel) {
        gsap.set(modalPanel, {
          clearProps: "opacity,transform,borderRadius,x,y,scaleX,scaleY,transformOrigin,overflow",
        });
      }
      if (modalBody) gsap.set(modalBody, { clearProps: "opacity,filter" });
      if (closeButton) gsap.set(closeButton, { clearProps: "opacity,filter" });
      if (modalBackdrop) gsap.set(modalBackdrop, { clearProps: "opacity" });
      modal.classList.remove("is-transitioning");
    }

    modal.classList.remove("is-open");
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    syncCursorSuppression();
    if (activeFadeTargets.length) {
      gsap.set(activeFadeTargets, { clearProps: "opacity,filter" });
      activeFadeTargets = [];
    }
    activeCaseSource = null;
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
    syncCursorSuppression();
    resetLightboxTransform();
    if (typeof gsap !== "undefined" && !prefersReducedMotion) {
      gsap.set(lightboxBackdrop, { opacity: 0 });
      gsap.set(lightboxImage, { opacity: 0, y: 12, filter: "blur(10px)" });
      gsap
        .timeline({ defaults: { ease: "power2.out" } })
        .to(lightboxBackdrop, { opacity: 1, duration: 0.2 }, 0)
        .to(lightboxImage, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.28 }, 0.06);
    }
    if (lightboxClose) lightboxClose.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("hidden", "");
    lightbox.setAttribute("aria-hidden", "true");
    syncCursorSuppression();
    if (lightboxImage) {
      lightboxImage.src = "";
      lightboxImage.alt = "";
      lightboxImage.classList.remove("is-dragging");
      lightboxImage.style.removeProperty("filter");
      lightboxImage.style.removeProperty("opacity");
      lightboxImage.style.removeProperty("transform");
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
      const opened = await openModal(key, link);
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

  if (cursor) {
    // Custom cursor is enhancement-only and only active on pointer-capable devices.
    const cursorOffsetX = 12;
    const cursorOffsetY = -12;
    const highIntentSelector =
      ".work-link, .case-modal-close, .lightbox-close, .footer-links a, .site-footer a";
    const isCursorSuppressed = () =>
      document.body.classList.contains("cursor-suppressed");
    const hideCursor = () => {
      cursor.classList.remove("is-active", "is-link", "is-cta");
    };

    syncCursorSuppression = () => {
      const shouldSuppress =
        modalTransitionState !== "idle" ||
        (lightbox && lightbox.classList.contains("is-open"));
      document.body.classList.toggle("cursor-suppressed", Boolean(shouldSuppress));
      if (shouldSuppress) hideCursor();
    };
    syncCursorSuppression();

    const moveCursor = (event) => {
      if (isCursorSuppressed()) return;
      const { clientX, clientY } = event;
      cursor.style.left = `${clientX + cursorOffsetX}px`;
      cursor.style.top = `${clientY + cursorOffsetY}px`;
    };

    const showCursor = () => {
      if (isCursorSuppressed()) return;
      cursor.classList.add("is-active");
    };

    const setLinkState = (event) => {
      if (isCursorSuppressed()) return;
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
    revealBootPage();
    startCssHeroFallback();
    setIntroScrollLock(false);
    if (bootBlack instanceof HTMLElement) {
      bootBlack.style.display = "none";
    }
    return;
  }

  const hasScrollTrigger = typeof ScrollTrigger !== "undefined";
  if (hasScrollTrigger) {
    // Enable scroll-based reveal triggers when plugin is available.
    gsap.registerPlugin(ScrollTrigger);
  }

  const mm = gsap.matchMedia();
  mm.add(
    {
      reduce: "(prefers-reduced-motion: reduce)",
      isDesktop: "(min-width: 721px)",
      isPointerFine: "(pointer: fine)",
    },
    (context) => {
      const { isDesktop, isPointerFine } = context.conditions;
      const heroContainer = document.querySelector(".site-header .container");
      const bootAlreadyVisible =
        bootStartsHidden &&
        pageRoot instanceof HTMLElement &&
        (() => {
          const pageStyles = window.getComputedStyle(pageRoot);
          const opacity = Number.parseFloat(pageStyles.opacity || "1");
          return pageStyles.visibility !== "hidden" && opacity > 0.95;
        })();
      const shouldRunBootIntro = bootStartsHidden && !bootAlreadyVisible;
      if (bootAlreadyVisible) {
        revealBootPage();
        setIntroScrollLock(false);
        if (bootBlack instanceof HTMLElement) {
          gsap.set(bootBlack, { autoAlpha: 0, display: "none" });
        }
      }
      // Keep the hero intro deterministic across mobile Safari variants.
      // Some iPhone sessions report reduced-motion unexpectedly, which previously skipped the intro.

      const { rows: introRows, dice: introDice, cubes: introCubes } = buildIntroColumns();
      const hasIntro =
        shouldRunBootIntro &&
        introOverlay instanceof HTMLElement &&
        introTray instanceof HTMLElement &&
        heroContainer instanceof HTMLElement &&
        introRows > 0 &&
        introCubes.length > 0;
      let introTl = null;
      let cleanupIntro = () => {};
      if (hasIntro) {
        const introLoops = [];
        const focusTopIndex = Math.max(0, Math.floor(introRows * 0.56) - 1);
        const focusBottomIndex = Math.min(introRows - 1, focusTopIndex + 1);
        const focusDice = [introDice[focusTopIndex], introDice[focusBottomIndex]].filter(
          (die) => die instanceof HTMLElement
        );
        const otherDice = introDice.filter((_, index) => index !== focusTopIndex && index !== focusBottomIndex);
        const introNameLines = Array.from(heroContainer.querySelectorAll(".name-line")).filter(
          (line) => line instanceof HTMLElement
        );
        const introNameTargetRects = introNameLines.map((line) => line.getBoundingClientRect());
        gsap.set(heroContainer, { opacity: 0 });
        if (introNameLines.length) {
          gsap.set(introNameLines, { opacity: 0 });
        }
        gsap.set(introOverlay, { autoAlpha: 1, display: "grid" });

        introCubes.forEach((cube, rowIndex) => {
          if (!(cube instanceof HTMLElement)) return;
          const faces = Array.from(cube.querySelectorAll(".intro-face")).filter(
            (face) => face instanceof HTMLElement
          );
          if (faces.length < 4) return;

          gsap.set(faces, {
            z: 200,
            rotateY: (i) => introRots[i % introRots.length].ry,
            transformOrigin: "50% 50% -201px",
          });

          const phaseA = [introRots[3].a, introRots[0].a, introRots[1].a, introRots[2].a];
          const phaseB = [introRots[0].a, introRots[1].a, introRots[2].a, introRots[3].a];
          const phaseC = [introRots[1].a, introRots[2].a, introRots[3].a, introRots[0].a];

          const loop = gsap
            .timeline({
              repeat: -1,
              yoyo: true,
              paused: true,
              defaults: { ease: "power3.inOut", duration: 1 },
            })
            .fromTo(
              cube,
              { rotateY: -90 },
              { rotateY: 90, ease: "power1.inOut", duration: 2 }
            )
            .fromTo(
              faces,
              { color: (j) => introFaceColor(rowIndex, introRows, phaseA[j % phaseA.length]) },
              { color: (j) => introFaceColor(rowIndex, introRows, phaseB[j % phaseB.length]) },
              0
            )
            .to(
              faces,
              { color: (j) => introFaceColor(rowIndex, introRows, phaseC[j % phaseC.length]) },
              1
            )
            .progress(rowIndex / introRows);
          introLoops.push(loop);
        });

        const trayLoop = gsap
          .timeline({ repeat: -1, yoyo: true, paused: true })
          .fromTo(introTray, { yPercent: -3 }, { yPercent: 3, duration: 3.2, ease: "sine.inOut" }, 0)
          .fromTo(introTray, { rotate: -15 }, { rotate: 15, duration: 6.2, ease: "sine.inOut" }, 0)
          .fromTo(introTray, { scale: 1.06 }, { scale: 1.2, duration: 3.2, ease: "power2.inOut" }, 0);
        introLoops.push(trayLoop);
        introLoops.forEach((loop) => loop.play());

        const introFocusAt = 2.32;
        const introMorphAt = 3.46;
        const introOverlayFadeAt = 4.86;
        const introCleanupAt = 5.56;

        introTl = gsap.timeline({ defaults: { ease: "power2.out" } });
        introTl
          .from(
            introDice,
            {
              y: 132,
              opacity: 0,
              duration: 0.9,
              ease: "power3.out",
              stagger: { each: -0.03, ease: "power2.out" },
            },
            0
          )
          .to(
            introCubes,
            {
              rotateY: (index) => {
                if (index === focusTopIndex) return 90;
                if (index === focusBottomIndex) return 0;
                return index % 2 === 0 ? 90 : 0;
              },
              duration: 0.62,
              ease: "sine.inOut",
            },
            introFocusAt
          )
          .to(
            otherDice,
            { opacity: 0.56, filter: "blur(1px)", duration: 0.52, ease: "sine.out" },
            introFocusAt + 0.04
          )
          .to(
            focusDice,
            { opacity: 1, filter: "blur(0px)", duration: 0.4, ease: "sine.out" },
            introFocusAt + 0.04
          )
          .add(() => {
            introLoops.forEach((loop) => loop.pause());
            if (!(heroContainer instanceof HTMLElement) || focusDice.length < 2) return;
            if (introNameLines.length < 2 || introNameTargetRects.length < 2) return;
            gsap.set(heroContainer, { opacity: 1 });
            const sourceRects = focusDice.map((die) => die.getBoundingClientRect());
            const targetRects = [introNameTargetRects[0], introNameTargetRects[1]];
            const focusCubes = focusDice
              .map((die) => die.querySelector(".intro-cube"))
              .filter((cube) => cube instanceof HTMLElement);
            focusCubes.forEach((cube, index) => {
              gsap.set(cube, { rotateY: index === 0 ? 90 : 0 });
            });

            introNameLines.forEach((line, index) => {
              const sourceRect = sourceRects[index];
              const targetRect = targetRects[index];
              const widthRatio = sourceRect.width / Math.max(1, targetRect.width);
              gsap.set(line, {
                position: "fixed",
                left: targetRect.left,
                top: targetRect.top,
                width: targetRect.width,
                height: targetRect.height,
                margin: 0,
                zIndex: 3340,
                transformOrigin: "top left",
                x: sourceRect.left - targetRect.left,
                y: sourceRect.top - targetRect.top,
                scaleX: widthRatio,
                scaleY: widthRatio,
                opacity: 1,
                filter: "blur(0px)",
                willChange: "transform, opacity",
              });
              gsap.to(line, {
                x: 0,
                y: 0,
                scaleX: 1,
                scaleY: 1,
                duration: 1.42,
                ease: "power2.inOut",
              });
            });

            gsap.to(otherDice, {
              opacity: 0,
              filter: "blur(10px)",
              duration: 1.02,
              ease: "power2.inOut",
            });
            gsap.to(focusDice, {
              opacity: 0,
              filter: "blur(7px)",
              duration: 0.64,
              ease: "power2.inOut",
            });
          }, introMorphAt)
          .to(introOverlay, { autoAlpha: 0, duration: 0.68, ease: "sine.out" }, introOverlayFadeAt)
          .add(() => {
            if (introNameLines.length) {
              gsap.set(introNameLines, {
                clearProps:
                  "position,left,top,width,height,margin,zIndex,transformOrigin,x,y,scaleX,scaleY,opacity,filter,willChange",
              });
            }
            gsap.set(introDice, {
              clearProps: "opacity,filter",
            });
          }, introCleanupAt)
          .add(() => {
            introLoops.forEach((loop) => loop.kill());
          })
          .set(introOverlay, { display: "none" })
          .to(heroContainer, { opacity: 1, duration: 0.14, ease: "power1.out" }, ">-0.02");

        cleanupIntro = () => {
          introLoops.forEach((loop) => loop.kill());
          if (introOverlay instanceof HTMLElement) {
            gsap.set(introOverlay, { autoAlpha: 0, display: "none" });
          }
          gsap.set(introDice, {
            clearProps: "opacity,filter",
          });
          if (heroContainer instanceof HTMLElement) {
            gsap.set(heroContainer, { clearProps: "opacity" });
            const nameLines = Array.from(heroContainer.querySelectorAll(".name-line")).filter(
              (line) => line instanceof HTMLElement
            );
            if (nameLines.length) {
              gsap.set(nameLines, {
                clearProps:
                  "position,left,top,width,height,margin,zIndex,transformOrigin,x,y,scaleX,scaleY,opacity,filter,willChange",
              });
            }
          }
          if (introPov instanceof HTMLElement) {
            gsap.set(introPov, { clearProps: "transform" });
          }
          if (introTray instanceof HTMLElement) {
            gsap.set(introTray, { clearProps: "transform,height" });
          }
        };
      } else {
        if (introOverlay instanceof HTMLElement) {
          gsap.set(introOverlay, { autoAlpha: 0, display: "none" });
        }
        if (heroContainer instanceof HTMLElement) {
          gsap.set(heroContainer, { opacity: 1 });
        }
      }

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
      const heroIntroChars = heroNameChars.filter(
        (charEl) => !charEl.classList.contains("name-char--space")
      );
      const nickname = document.querySelector(".nickname");

      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      let introStartAt = 0;
      if (introTl) {
        heroTl.add(introTl);
        if (bootBlack instanceof HTMLElement) {
          heroTl.set(bootBlack, { autoAlpha: 0, display: "none" }, 0);
        }
        introStartAt = ">";
      } else if (bootBlack instanceof HTMLElement && shouldRunBootIntro) {
        heroTl
          .set(bootBlack, { autoAlpha: 1, display: "block" }, 0)
          .set(bootBlack, { autoAlpha: 0, display: "none" }, 0.2);
        introStartAt = 0.2;
      } else if (bootBlack instanceof HTMLElement) {
        gsap.set(bootBlack, { autoAlpha: 0, display: "none" });
      }
      const shouldAnimateNameChars = !hasIntro && shouldRunBootIntro;
      if (shouldAnimateNameChars) {
        const tubeDepth = Math.max(84, Math.round(window.innerWidth / 9));
        heroTl.set(
          heroNameLines,
          {
            transformPerspective: 1200,
            transformStyle: "preserve-3d",
          },
          0
        );
        heroTl.set(
          heroIntroChars,
          {
            opacity: 1,
            rotationX: -96,
            yPercent: 122,
            z: -96,
            filter: "blur(7px)",
            transformOrigin: `50% 50% -${tubeDepth}px`,
          },
          0
        );
        heroTl.addLabel("intro", introStartAt);
        const nameRollSpinDuration = 1.2;
        const nameRollSettleDuration = 0.56;
        const nameRollStagger = 0.08;
        const nameRollStart = 0.14;
        const nameRollTotal =
          nameRollSpinDuration +
          nameRollSettleDuration +
          nameRollStagger * Math.max(0, heroIntroChars.length - 1);

        heroTl.to(
          heroIntroChars,
          {
            rotationX: 630,
            yPercent: 0,
            z: 0,
            opacity: 1,
            filter: "blur(1px)",
            duration: nameRollSpinDuration,
            ease: "none",
            stagger: { each: nameRollStagger, from: "start" },
            immediateRender: false,
          },
          `intro+=${nameRollStart}`
        );
        heroTl.to(
          heroIntroChars,
          {
            rotationX: 720,
            filter: "blur(0px)",
            duration: nameRollSettleDuration,
            ease: "power3.out",
            stagger: { each: nameRollStagger, from: "start" },
            immediateRender: false,
          },
          `intro+=${(nameRollStart + nameRollSpinDuration).toFixed(2)}`
        );
        heroTl.set(heroIntroChars, { rotationX: 0 }, `intro+=${(nameRollStart + nameRollTotal).toFixed(2)}`);
        heroTl.addLabel("copyIn", `intro+=${(nameRollStart + nameRollTotal + 0.08).toFixed(2)}`);
      } else {
        heroTl.addLabel("intro", introStartAt);
        heroTl.set(
          heroIntroChars,
          { opacity: 1, rotationX: 0, x: 0, yPercent: 0, z: 0, filter: "blur(0px)" },
          "intro"
        );
        heroTl.addLabel("copyIn", "intro+=0.02");
      }
      let unlockAt = "copyIn+=0.02";
      if (nickname instanceof HTMLElement && shouldRunBootIntro) {
        heroTl.set(nickname, { opacity: 0, y: 8, filter: "blur(6px)" }, 0);
        heroTl.to(
          nickname,
          { opacity: 0.9, y: 0, filter: "blur(0px)", duration: 0.42, ease: "power2.out" },
          "copyIn+=0.04"
        );
        unlockAt = "copyIn+=0.46";
      }
      heroTl.add(() => {
        revealBootPage();
      }, "intro");

      const heroRule = document.querySelector(".rule");
      if (heroRule instanceof HTMLElement && shouldRunBootIntro) {
        const finalRuleWidth = Math.max(1, Math.round(heroRule.getBoundingClientRect().width));
        heroTl.fromTo(
          heroRule,
          { width: 0, opacity: 0, filter: "blur(6px)" },
          {
            width: finalRuleWidth,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.62,
            ease: "power2.out",
            clearProps: "width,opacity,filter",
          },
          "copyIn+=0.2"
        );
      }
      heroTl.addLabel("settle");
      if (shouldRunBootIntro) {
        heroTl.add(() => {
          setIntroScrollLock(false);
        }, unlockAt);
      }

      const tagline = document.querySelector(".tagline");
      if (tagline instanceof HTMLElement && shouldRunBootIntro) {
        if (!tagline.dataset.wordsReady) {
          const raw = (tagline.textContent || "").trim().replace(/\s+/g, " ");
          const words = raw.split(" ").filter(Boolean);
          tagline.textContent = "";
          words.forEach((word, index) => {
            const span = document.createElement("span");
            span.className = "tagline-word";
            const normalized = word.toLowerCase().replace(/[^\w]/g, "");
            if (normalized === "slightly") span.classList.add("tagline-word--slightly");
            if (normalized === "shorter") span.classList.add("tagline-word--shorter");
            span.textContent = word;
            tagline.appendChild(span);
            if (index < words.length - 1) tagline.appendChild(document.createTextNode(" "));
          });
          tagline.dataset.wordsReady = "true";
        }

        const normalTaglineWords = gsap.utils.toArray(
          ".tagline .tagline-word:not(.tagline-word--slightly):not(.tagline-word--shorter)"
        );
        const slightlyWord = tagline.querySelector(".tagline-word--slightly");
        const shorterWord = tagline.querySelector(".tagline-word--shorter");

        heroTl.fromTo(
          normalTaglineWords,
          { y: 12, opacity: 0, filter: "blur(8px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.42,
            stagger: 0.085,
            ease: "power2.out",
          },
          "copyIn+=0.08"
        );

        if (slightlyWord instanceof HTMLElement) {
          if (!slightlyWord.querySelector(".tagline-char")) {
            const raw = (slightlyWord.textContent || "").trim();
            slightlyWord.textContent = "";
            Array.from(raw).forEach((char) => {
              const span = document.createElement("span");
              span.className = "tagline-char";
              span.textContent = char;
              slightlyWord.appendChild(span);
            });
          }
          const slightlyChars = gsap.utils.toArray(".tagline-word--slightly .tagline-char");
          heroTl.fromTo(
            slightlyChars,
            { y: 8, opacity: 0, filter: "blur(8px)" },
            {
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.24,
              stagger: 0.095,
              ease: "power2.out",
            },
            ">+0.06"
          );
        }

        if (shorterWord instanceof HTMLElement) {
          heroTl.fromTo(
            shorterWord,
            { y: 8, opacity: 0, filter: "blur(8px)" },
            {
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.36,
              ease: "power2.out",
            },
            ">+0.12"
          );
        }
      } else {
        if (shouldRunBootIntro) {
          heroTl.from(
          ".tagline",
          { y: 18, opacity: 0, filter: "blur(8px)", duration: 0.7 },
          "copyIn+=0.1"
          );
        }
      }

      const cleanupHeroPointer = null;

      let cleanupCardPointer = null;
      if (isPointerFine) {
        const links = gsap.utils.toArray(".work-link");
        const disposers = [];

        links.forEach((link) => {
          if (!(link instanceof HTMLElement)) return;
          const media = link.querySelector(".work-media img");
          gsap.set(link, { transformPerspective: 900, transformOrigin: "center center" });

          const toRotateY = gsap.quickTo(link, "rotateY", { duration: 0.34, ease: "power3.out" });
          const toRotateX = gsap.quickTo(link, "rotateX", { duration: 0.34, ease: "power3.out" });
          const toZ = gsap.quickTo(link, "z", { duration: 0.34, ease: "power3.out" });

          const handleMove = (event) => {
            const rect = link.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width - 0.5;
            const ny = (event.clientY - rect.top) / rect.height - 0.5;
            toRotateY(nx * 3.4);
            toRotateX(-ny * 2.8);
            toZ(14);
            if (media) {
              gsap.to(media, { scale: 1.04, duration: 0.45, ease: "power3.out", overwrite: true });
            }
          };

          const handleLeave = () => {
            toRotateY(0);
            toRotateX(0);
            toZ(0);
            if (media) {
              gsap.to(media, { scale: 1, duration: 0.45, ease: "power3.out", overwrite: true });
            }
          };

          link.addEventListener("pointermove", handleMove);
          link.addEventListener("pointerleave", handleLeave);
          disposers.push(() => {
            link.removeEventListener("pointermove", handleMove);
            link.removeEventListener("pointerleave", handleLeave);
          });
        });

        cleanupCardPointer = () => {
          disposers.forEach((dispose) => dispose());
        };
      }

      if (hasScrollTrigger) {
        // Section heading reveal (label + rule draw) on scroll.
        ["#work-title", "#about-title"].forEach((selector) => {
          const sectionTitle = document.querySelector(selector);
          if (!(sectionTitle instanceof HTMLElement)) return;
          gsap.set(sectionTitle, { "--h2-rule-scale": 0, opacity: 0, y: 16, filter: "blur(8px)" });
          gsap
            .timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                trigger: sectionTitle,
                start: "top 86%",
                toggleActions: "play none none none",
              },
            })
            .to(sectionTitle, {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.56,
              letterSpacing: "0.12em",
              clearProps: "letterSpacing",
            })
            .to(
              sectionTitle,
              { "--h2-rule-scale": 1, duration: 0.62, ease: "power2.out" },
              0.06
            );
        });

        gsap.utils.toArray(".work-item").forEach((item) => {
          gsap.from(item, {
            y: 28,
            opacity: 0,
            filter: "blur(10px)",
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          });
        });

        gsap.from(".about-photo", {
          y: 40,
          opacity: 0,
          filter: "blur(10px)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".about-bleed",
            start: "top 75%",
            toggleActions: "play none none none",
          },
        });

        gsap.from(".about-layout p", {
          y: 20,
          opacity: 0,
          filter: "blur(8px)",
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".about-layout",
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });

        const footer = document.querySelector(".site-footer");
        if (footer) {
          gsap.from(".footer-heading, .footer-links a, .footer-brand", {
            y: 14,
            opacity: 0,
            filter: "blur(8px)",
            delay: 0.45,
            duration: 0.42,
            stagger: 0.06,
            ease: "power2.out",
            scrollTrigger: {
              trigger: footer,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          });
        }
      }

      return () => {
        cleanupIntro();
        revealBootPage();
        setIntroScrollLock(false);
        if (bootBlack instanceof HTMLElement) {
          gsap.set(bootBlack, { autoAlpha: 0, display: "none" });
        }
        if (cleanupHeroPointer) cleanupHeroPointer();
        if (cleanupCardPointer) cleanupCardPointer();
      };
    }
  );
})();
