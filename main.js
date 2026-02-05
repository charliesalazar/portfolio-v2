(() => {
  const cursor = document.querySelector(".cursor");
  if (cursor) {
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

  // Intent: respect reduced-motion preferences and skip animation if GSAP isn't loaded.
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced || typeof gsap === "undefined") {
    return;
  }

  // Intent: enable ScrollTrigger for scroll-based reveals.
  gsap.registerPlugin(ScrollTrigger);

  // Intent: hero intro sequence to set tone without heavy motion.
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
