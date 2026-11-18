# Rise Pattaya website

Restaurant and bar website for Rise, Pattaya, with online table booking, a live floor plan and deposits.

Built by AiEngineered.

## Status

Phase 1 (this commit): front end. Sample menu, hours, address and table layout. Bookings use sample data and payments run in demo mode.

Phase 2: live bookings.

- Supabase: `tables` and `bookings`, so availability is real and shared between guests and staff
- Stripe (Rise's own Thailand account): Checkout with cards and PromptPay, deposit paid straight to Rise
- Webhook: confirms the booking once paid, holds the table, emails the guest, adds it to the restaurant calendar
- Staff view behind a login

## Deposit rules

- Up to 6 guests: ฿500 per table
- 7 or more guests: ฿500 per guest
- Comes off the bill on the night; refunded in full if cancelled 24+ hours ahead

## Deploy

GitHub → Vercel (auto-deploys on push to `main`) → domain via Cloudflare DNS (CNAME to Vercel).
