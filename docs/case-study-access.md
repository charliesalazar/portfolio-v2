# Case Study Access Control Runbook

This runbook adds password-style access to case studies only:

- Protected: `/cases/*`
- Public: home page and other routes

## Recommended Approach

Use **Cloudflare Access** in front of your existing static host.  
Do not use client-side password prompts in JavaScript.

## Prerequisites

1. Your domain is active in Cloudflare DNS.
2. Your site is already deployed (GitHub Pages/Netlify/Vercel/etc.).
3. You have Cloudflare dashboard admin access.

## Setup

1. In Cloudflare dashboard, go to `Zero Trust`.
2. Go to `Access` -> `Applications`.
3. Click `Add an application`.
4. Choose `Self-hosted`.
5. Configure:
   - `Application name`: `Portfolio Case Studies`
   - `Domain`: your domain (example: `charliesalazar.com`)
   - `Path`: `/cases/*`
6. Create an **Allow** policy:
   - Include: specific emails (recommended), or one-time PIN.
   - Add your own email first to avoid lockout.
7. Save and deploy policy.

## Verify

1. Open `https://yourdomain.com/` -> should stay public.
2. Open `https://yourdomain.com/cases/case_study_transcat.html` -> should require authentication.
3. Test in an incognito window.

## Fast Rollback

If anything breaks:

1. Return to `Zero Trust` -> `Access` -> `Applications`.
2. Open `Portfolio Case Studies`.
3. Disable or delete the policy.

Traffic returns to normal immediately after propagation.

## Safe Defaults

- Start with a small allowlist (only your email).
- Add collaborators one-by-one.
- Keep `/cases/*` only; avoid protecting `/` unless intentional.

## Optional Upgrade

If you need shareable, temporary access:

- Use email one-time PIN.
- Or create temporary users and remove them after reviews.
