# RISE Rooftop by Beer Hubb

Website for RISE Rooftop at Central Pattaya: moonrise hero, live "tonight" panel, menu, photo gallery, online table booking with a live floor plan and deposits, and a staff bookings view. English and Thai.

Live: https://rise.aiengineered.co.uk (Vercel project `rise-pattaya`, auto-deploys from `main`)

Built by AiEngineered.

## What's here

- `index.html`: the whole site in one page (markup, styles and script). English and Thai text live in the `T` object in the script.
- `MENU` and `PHOTOS` near the top of the script: menu cards and the "Nights at RISE" gallery.
- `TABLES`: the floor plan (id, shape, seats, position). Sample layout until Garry confirms the real one.
- `img/`: photos (AVIF, from @rise.pattaya), `og.jpg` link preview, `icon-180.png`.
- Staff area (`staff.js`), linked as "Staff" in the footer:
  - `#staff`: bookings timeline and floor plan at a chosen time
  - `#staff-rota`: weekly rota. Tap a day to add, change or hand over a shift; cover warnings per night; copy last week
  - `#staff-clock`: clock in and out with name + 4-digit PIN (bookmark this on the bar tablet)
  - `#staff-hours`: paid hours per person per day, late arrivals, missed clock-outs (fixable), overtime flags, CSV download, send to Google Sheet
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

## Timesheet to Google Sheets

Every clock-in, clock-out and manager fix is sent to a Google Sheet once it's connected (one row per shift, plus a "Weekly totals" tab).

1. Create a Google Sheet "RISE Timesheet", open Extensions > Apps Script, paste `tools/google-sheets-timesheet.gs`, set `SHARED_KEY`.
2. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Copy the URL.
3. In `staff.js` set `SHEET_URL` to that URL and `SHEET_KEY` to the same key. Push.

Hours rules (top of `staff.js`): 60-minute unpaid break on shifts over 5 hours, flags over 8 hours a day / 48 a week (Thai Labour Protection Act) with 15 minutes' grace, late after 10 minutes.

Until phase 2, the rota and hours are saved in the browser of the device using them (sample data). Phase 2 moves them to Supabase so every phone and tablet shares them, with a manager login and PINs checked on the server.

## Domain

Cloudflare DNS for aiengineered.co.uk: CNAME `rise` → `cname.vercel-dns.com` (DNS only). Already added to the Vercel project.
