# RISE Rooftop by Beer Hubb

Website for RISE Rooftop at Central Pattaya: moonrise hero, live "tonight" panel, menu, photo gallery, online table booking with a live floor plan and deposits, and a staff bookings view. English and Thai.

Live: https://rise.aiengineered.co.uk (Vercel project `rise-pattaya`, auto-deploys from `main`)

Built by AiEngineered.

## What's here

- `index.html`: the whole site in one page (markup, styles and script). English and Thai text live in the `T` object in the script.
- `MENU` and `PHOTOS` near the top of the script: menu cards and the "Nights at RISE" gallery.
- `TABLES`: the floor plan (id, shape, seats, position). Sample layout until Garry confirms the real one.
- `img/`: photos (AVIF, from @rise.pattaya), `og.jpg` link preview, `icon-180.png`.
- `#staff` opens the staff bookings view (timeline + floor at a chosen time).
- `robots.txt`, `sitemap.xml`: for Google.

No build step. Vercel serves the files as they are.

## Deposit rules

- Up to 6 guests: ฿500 per table
- 7 or more guests: ฿500 per guest
- Comes off the bill on the night; refunded in full if cancelled 24+ hours ahead

## Status

Phase 1 (now): front end. Bookings use sample data and payments run in demo mode. Opening hours and table layout are samples.

Phase 2: live bookings.

- Supabase: `tables` and `bookings`, so availability is real and shared between guests and staff
- Stripe (RISE's own Thailand account): Checkout with cards and PromptPay, deposit paid straight to RISE
- Webhook: confirms the booking once paid, holds the table, emails the guest, adds it to the restaurant calendar
- Staff view behind a login

## Domain

Cloudflare DNS for aiengineered.co.uk: CNAME `rise` → `cname.vercel-dns.com` (DNS only). Already added to the Vercel project.
