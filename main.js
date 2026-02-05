(() => {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced || typeof gsap === "undefined") {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

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
})();
