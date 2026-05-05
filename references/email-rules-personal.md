# Personal Gmail rules — adriangilbert26@gmail.com

Captured during P1 cleanup. Source of truth for `cleanup-inbox` and (future) `triage-inbox` skills.

## Stats — cumulative

| Metric | Session start (5 May AM) | After all batches |
|---|---:|---:|
| Inbox total | 22,981 | **4,494** |
| Unread in inbox | ~19,700 | **199** |
| Filters active (auto-route) | 0 | **8** |
| User labels | 7 (some empty/junk) | **21** (organized + colored) |

Total messages moved out of inbox: ~18,500. Inbox 80% smaller, unread visual clutter 99% gone.

## Label organization

### Color scheme (category-coded)

| Color | Category | Labels |
|---|---|---|
| 🟢 Green | Banking | `Banking/India`, `Banking/Bunq` |
| ⚫ Grey | Marketing | `Marketing/{Bulk, Myprotein, Zamnesia, AliExpress, Alibaba}` |
| 🔵 Blue | Shipping + Service | `Shipping/{DHL, Amazon, DPD, bol}`, `Service/{Klarna, ASUS}` |
| 🟠 Orange | Marketplace | `Marktplaats`, `Marktplaats/Auto` |
| 🟡 Yellow | Tools / alerts | `Tweakers` |
| 🟣 Purple | Education | `Education/{UTwente, Calgary, MITACS, Admissions}` |
| 🩷 Pink | Personal | `Teenu Sauce` |

### Deleted labels (residue)
- `[Imap]/Drafts`, `[Imap]/Trash` — IMAP client residue, both empty

### Renamed (nested under Education/)
- `UTwente` → `Education/UTwente`
- `University of Calgary` → `Education/Calgary`
- `MITACS` → `Education/MITACS`
- `Admissions` → `Education/Admissions`

## Bulk passes

### 2026-05-05 — Old unread bankruptcy
- Query: `is:unread older_than:6m` → archived **16,943** messages

### 2026-05-05 — Mark-read of older unread
- Query: `is:unread in:inbox older_than:30d` → marked read **1,153** messages
- Rationale: visual cleanup; messages stay in inbox but lose bold/unread styling. Last 30 days remain unread for review.

## Auto-archive filters (Gmail filters live; future mail skips inbox)

| Match | Label |
|---|---|
| `from:info@n.myprotein.com` | `Marketing/Myprotein` |
| `from:bulk_nl@news.bulk.com` | `Marketing/Bulk` |
| `from:news@marketing.zamnesia.com` | `Marketing/Zamnesia` |
| `from:notification@tweakers.net` | `Tweakers` |
| `from:automatisch@marktplaats.nl` | `Marktplaats/Auto` |
| `from:aliexpress.com` (domain) | `Marketing/AliExpress` |
| `from:alibaba.com` (domain) | `Marketing/Alibaba` |

Domain filters are particularly powerful — they catch all subdomain variants (e.g. AliExpress sends from many `*.aliexpress.com` subdomains; one filter handles them all).

## Labeled but kept in inbox (no filter — new mail still hits inbox)

| Sender / pattern | Label | Why |
|---|---|---|
| `noreply@dhlecommerce.nl` | `Shipping/DHL` | Want visible when expecting packages |
| `verzending-volgen@amazon.nl` | `Shipping/Amazon` | Same |
| `notificaties@dpd.nl` | `Shipping/DPD` | Same |
| `automail@bol.com` | `Shipping/bol` | Dutch e-commerce; order updates matter |
| `*@mail.marktplaats.nl` | `Marktplaats` | Buyer messages — money in inbound |
| `alerts@dcbbank.com` | `Banking/India` | DCB Bank transaction alerts |
| `donotreply@dcbbank.com` | `Banking/India` | DCB Bank system messages |
| `info@digital.axisbankmail.bank.in` | `Banking/India` | Axis Bank |
| `no-reply@update.bunq.com` | `Banking/Bunq` | Dutch fintech transaction notifications |
| `noreply@hello.klarna.com` | `Service/Klarna` | BNPL payment service |

## Labeled, existing archived, no filter

These had existing mail tagged + archived, but new mail still hits inbox:

| Sender | Label |
|---|---|
| `noreply@nedm.asus.com` | `Service/ASUS` |

## Keep in inbox (no label, no action)

| Sender | Why |
|---|---|
| `noreply@kpn.com` | Dutch telco — billing/service |
| `no-reply@accounts.google.com` | Security alerts |

## Manually unsubscribed (Adrian clicks Unsubscribe in Gmail UI)

Existing already archived. Find one example email per sender, click the Unsubscribe chip near the From line.

- [ ] `jobalerts-noreply@linkedin.com` — LinkedIn jobs (312)
- [ ] `journeys@em.journeys.com` — Travel (22)
- [ ] `support@shaperluv.com` — Fashion (53)
- [ ] `owen@agentcartel.com` — AI newsletter (15)
- [ ] `store-news@amazon.nl` — Amazon promos (51)
- [ ] `hello@official.asos.com` — Fashion (65)
- [ ] `info@emails.jdsports.nl` — Fashion (21)
- [ ] `message@news4.zalando.com` — Fashion (20)
- [ ] `mail@mailer.hollandandbarrett.nl` — Health/supplements (61)
- [ ] `news@mail.sovendus.com` — Deal aggregator (30)
- [ ] `remind@notice.alibaba.com` — Promo reminders (9)
- [ ] `happiness@moments.fnp.com` — FNP / Ferns N Petals (35)
- [ ] `ae-best-message-notice20@newarrival.aliexpress.com` — AliExpress recs (8)
- [ ] `nate@aiautomationsociety.ai` — AI newsletter (8)
- [ ] `Trip.com@newsletter.trip.com` — Travel (27)
- [ ] `info@updates.wintwealth.com` — Wint Wealth newsletter (77)
- [ ] `no-reply@accounts.bitly.com` — Bitly (5)
- [ ] `voucher@appinx.sovendus.com` — Sovendus deals (20)
- [ ] `in-marketing@member.timezonegames.com` — Timezone gaming (44)
- [ ] `mail@depositphotos.com` — DepositPhotos (28)
- [ ] `info@blackfridaynederland.nl` — Black Friday NL (7)
- [ ] `kfc@em.kfc.ca` — KFC Canada (10)
- [ ] `noreply@communication.basic-fit.com` — Basic-Fit gym (11)
- [ ] `marketing@mrfillet.nl` — Mr. Fillet food (16)
- [ ] `noreply-nl@onthatass.com` — ON THAT ASS (9)
- [ ] `hello@chess.com` — Chess.com (6)
- [ ] `noreply-in@email.decathlon.in` — Decathlon India (16)

When Adrian completes an unsubscribe, change `[ ]` to `[x]`.

Note: For senders covered by domain filters (AliExpress *, Alibaba *), unsubscribing is optional — the filter already auto-routes future mail.

## Investigate later (not blocking)

- ~~DCB Bank — confirmed legitimate (Adrian has Indian banking accounts).~~ Resolved 2026-05-05.

## Resuming the cleanup

To run another pass anytime:
1. Open Claude Code in `/Users/adrian/projects/jarvis`
2. Say "let's clean up Gmail more" or invoke the `cleanup-inbox` skill
3. The skill, tool, OAuth, and rules persist — picks up cold

For specific operations: see `tools/gmail.py --help`.

## Classification rules for `extract-tasks` skill (P2.2+)

These refine the P1 rules above. P1 was about *where* mail lands (inbox/label/archive). These are about *whether* a message becomes a task in `tasks/<date>.jsonl`.

### Marktplaats — split rule (refined 2026-05-05)

Marktplaats per-buyer addresses (`*@mail.marktplaats.nl`) all carry the `Marktplaats` label and stay in inbox (P1 rule unchanged). For task extraction:

- **Task** (low priority, due ≈ today): explicit price offer ("I'll pay €250"), pickup/delivery commitment ("I can come Saturday at 14:00"), scheduling proposal. Buyer urgency typically expires same-day.
- **Skip** (revenue, no task): pleasantries ("good luck"), generic interest ("is it still available?"), photo requests, lowball pings without commitment, follow-ups on threads where Adrian has already replied.

**Why split:** every Marktplaats message looked the same to the first-pass classifier, but only the explicit-offer ones are actually task-shaped. Generic interest doesn't need a daily task list entry — Adrian sees them in inbox and replies if interested.
