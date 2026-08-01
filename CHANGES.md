# Changes made from your list

Run `supabase/migrations/0004_activity_addresses_emails_legal.sql` against your
Supabase project before deploying — everything below depends on it.

## Done

- **Contact Type on right / Segment on right below Category** — Identity tab
  reordered: Category (left) / Contact Type (right), Assigned-to (left) /
  Segment (right, under Category).
- **Significant/insignificant + reschedule call+time, under Activity tab** —
  each logged activity note now has a Significant/Insignificant dropdown and
  a date+time "reschedule" picker, saved with that note.
- **Call delayed by, on the Contacts dashboard** — new "Call Status" column
  shows e.g. "3d delayed" or "On track", based on the nearest reschedule
  date/time across the branch's activities.
- **Shift Default Calling to the Activity tab** — moved out of Identity.
- **Multiple addresses (Billing/Mailing/Other) + default address** — Address
  tab is now a repeatable list like "More Contacts"; star-icon marks the
  default one. New `branch_addresses` table.
- **Pincode autocomplete** — leaving the Pin field auto-fills Town/District/
  State (via the India Post public API) when they're blank. Needs internet
  access at runtime; fails silently if unreachable.
- **"Only keep town"** — dropped the separate Locality/Area field from
  addresses; Town is the one place field now.
- **More Contacts: multiple emails** — email is now a repeatable
  label+address list per person, same pattern as phone numbers. New
  `contact_emails` table.
- **Multiline box in Activity** — note input is a textarea now.
- **Popup doesn't close on Save** — Save just refreshes the data and shows
  a "✓ Saved" flash; the dialog only closes on Cancel/X.
- **Popup doesn't close on clicking sideways** — removed the click-outside-
  to-close behavior.
- **Delete confirmation** — added `confirm()` prompts to every delete action
  in the modal (person, phone, email, address, activity note) — this already
  existed for deleting a whole contact from the dashboard.
- **Mobile number formatted 3-3-4** — numbers reformat to `000-000-0000` on
  blur when editing, and display that way on the dashboard.
- **Filters in the Contacts dashboard** — a Filters panel for Category,
  Segment, Status, Town, Branch Code.
- **Filter of primary contact** — a "Primary contact only" checkbox next to
  search, so search matches only the primary person instead of everyone
  linked to the branch.
- **New "Legal" tab** — GST No., PAN No., Aadhar No., Company Registration
  No., and Registered/Legal Company Name, at the branch level (distinct from
  the per-person legal fields already on each contact).

## Needs your input before I build it

- **"amb - contact status"** — I couldn't confidently tell what this refers
  to. If it means adding "AMB" (Average Monthly Balance) as a tracked field
  for bank/financial-institute contacts, or a new Contact Status option, or
  something else, let me know and I'll add it.
- **"br.code"** — I read this as confirming Branch Code should be one of the
  dashboard filter fields (done, see Filters above). If you meant something
  else — e.g. a branch code per address, rather than per company — say the
  word and I'll adjust.

## Notes on how I read a couple of the shorthand items

- "Contact type on right" / "segment on right below category" — since there
  was no mockup, I inferred the layout above. Easy to rearrange further if
  it's not quite right.
- Old single-address columns on `branches` (shop_no, town, pin, etc.) are
  left in the database, unused — nothing is deleted, so no data is lost if
  I've misread something.
