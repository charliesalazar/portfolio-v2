<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Carlos (Charlie) Salazar Portfolio</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1 class="name" aria-label="Carlos Salazar (Charlie)">
      <span class="name-lines">
        <span class="name-line">CARLOS</span>
        <span class="name-line">SALAZAR</span>
      </span>
      <span class="nickname">(CHARLIE)</span>
    </h1>
  </header>

  <main>
    <section class="case-studies">
      <!-- Case studies would be listed here -->
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-contact">
      <a href="mailto:charliesalazar@gmail.com">charliesalazar@gmail.com</a>
      <span class="dot">•</span>
      <a href="https://linkedin.com/in/charliesalazar" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <span class="dot">•</span>
      <a href="tel:+13109908984">(310) 990-8984</a>
    </div>
    <p class="copyright">© Carlos (Charlie) Salazar</p>
  </footer>
</body>
</html>
/* General styles */

.name {
  margin: 0;
  text-transform: uppercase;
  font-variation-settings: "wdth" 125, "wght" 900;
  letter-spacing: -0.04em;
  line-height: 0.9;
  font-size: clamp(3.4rem, 7.2vw, 6.4rem);
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.name-lines {
  display: inline-block;
}

.name-line {
  display: block;
}

.name:hover .name-line {
  transform: translateY(-1px);
}

.name-line {
  transition: transform 140ms ease;
}

.nickname {
  font-variation-settings: "wdth" 125, "wght" 700;
  font-size: 0.22em;
  letter-spacing: 0.14em;
  margin-left: 6px;
  opacity: 0.9;
}

/* Footer styles */
.site-footer {
  margin-top: 128px;
  padding-top: 28px;
  border-top: 2px solid #000;
}

.footer-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 0.95rem;
  color: #111;
  margin: 0;
}

.footer-contact a {
  color: inherit;
  text-decoration: none;
  border-bottom: 2px solid #000;
  padding-bottom: 2px;
  font-weight: 700;
}

.footer-contact a:hover {
  opacity: 0.75;
}

.footer-contact .dot {
  opacity: 0.45;
}

.site-footer .copyright {
  margin-top: 18px;
  font-size: 0.85rem;
  color: #666;
}