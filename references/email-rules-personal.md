# Personal Gmail rules — adriangilbert26@gmail.com

Captured during P1 cleanup. Source of truth for `cleanup-inbox` and (future) `triage-inbox` skills.

## Stats — initial cleanup pass (2026-05-05)

| Metric | Before | After |
|---|---:|---:|
| Inbox total | 22,981 | **5,114** |
| Unread in inbox | ~19,700 | **1,909** |
| Filters active (auto-route) | 0 | **5** |
| Labels created | 0 | **9** |

Total messages moved out of inbox: ~17,867.

## Bulk passes

### 2026-05-05 — Old unread bankruptcy
- Query: `is:unread older_than:6m`
- Action: archived 16,943 messages
- Rationale: time-expired; action window closed for support tickets, marketing, alerts

## Auto-archive filters (Gmail filters live; future mail skips inbox)

| From | Label |
|---|---|
| `info@n.myprotein.com` | `Marketing/Myprotein` |
| `bulk_nl@news.bulk.com` | `Marketing/Bulk` |
| `news@marketing.zamnesia.com` | `Marketing/Zamnesia` |
| `notification@tweakers.net` | `Tweakers` |

(Filter for ASOS/JD Sports/Zalando/etc. NOT created — relying on user unsubscribing instead. If senders ignore the unsubscribe, add filters later.)

## Labeled but kept in inbox (no filter — new mail still visible)

| Sender / pattern | Label | Why |
|---|---|---|
| `noreply@dhlecommerce.nl` | `Shipping/DHL` | Shipping — want visible when expecting a package |
| `*@mail.marktplaats.nl` | `Marktplaats` | Buyer messages — actual people wanting to give money |

## Keep in inbox (no label, no action)

| Sender | Why |
|---|---|
| `noreply@kpn.com` | Dutch telco — billing/service |
| `no-reply@accounts.google.com` | Security alerts |

## Manually unsubscribed (Adrian clicks "Unsubscribe" in Gmail UI)

These need a one-time human click on the Unsubscribe chip in any sample email. Existing already archived. Use Gmail's search to find one of each:

- [ ] `jobalerts-noreply@linkedin.com` — LinkedIn jobs (312 archived)
- [ ] `journeys@em.journeys.com` — Travel (22)
- [ ] `support@shaperluv.com` — Fashion/clothing (53)
- [ ] `owen@agentcartel.com` — AI newsletter (15)
- [ ] `store-news@amazon.nl` — Amazon promos (51)
- [ ] `hello@official.asos.com` — Fashion (65)
- [ ] `info@emails.jdsports.nl` — Fashion (21)
- [ ] `message@news4.zalando.com` — Fashion (20)
- [ ] `mail@mailer.hollandandbarrett.nl` — Health/supplements (61)
- [ ] `news@mail.sovendus.com` — Deal aggregator (30)
- [ ] `remind@notice.alibaba.com` — Promo reminders (9)

When Adrian completes an unsubscribe, change `[ ]` to `[x]` here.

## Investigate later (not blocking)

- **DCB Bank** (`alerts@dcbbank.com`) — Indian bank transaction alerts (creditedit, debit, beneficiary creation). Determine:
  - Do you have a DCB Bank account? If yes, log in and check for legit transactions.
  - If no: someone may have used your email to register, OR phishing. Investigate sender authenticity before action.

## Sender catalog (not yet decided)

Senders we noticed but haven't classified. Walk these in next cleanup pass:

- KPN — kept in inbox (above)
- Daan via Marktplaats (38) — covered by Marktplaats label
- Amazon.nl `verzending-volgen@amazon.nl` — shipping tracking (transactional)
- Google `no-reply@accounts.google.com` — security alerts (kept in inbox)
- Other long-tail senders (each <5/sample) — handle in P1 follow-up
