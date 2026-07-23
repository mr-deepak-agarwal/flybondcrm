-- ════════════════════════════════════════════════════════════════
-- Migration 0003: backfill branches + contact_phones from existing
-- `contacts` rows.
--
-- Approach: since the OLD data has no concept of "branch" at all,
-- we create exactly ONE branch per existing contact (never merging
-- by company name — see the note in 0002 about Canara Bank having
-- two distinct branches with the same name). That new branch takes
-- the contact's company/address/classification fields, and the
-- contact is linked to it as the primary person.
--
-- Safe to re-run: skips any contact that already has a company_id.
-- ════════════════════════════════════════════════════════════════

do $$
declare
  r          contacts%rowtype;
  new_branch_id uuid;
begin
  for r in select * from contacts where company_id is null loop

    insert into branches (
      name, contact_type, category, segment, status, assigned_to,
      about, address_type, area, town, pin, taluka, district, state
    ) values (
      coalesce(nullif(r.company, ''), r.first_name || ' ' || coalesce(r.last_name, '')), -- fall back to person's name if no company on file
      r.contact_type,
      r.category,
      r.segment,
      -- old `status` values (suspect/prospect/unassigned/active/loyal/blacklisted) don't map 1:1
      -- onto the new set (Dump/Suspect/Prospect/Customer 1/Customer 2/Customer+/Regular/Loyal/5 Star).
      -- Mapped conservatively below; review after migration and adjust in bulk if needed.
      case r.status
        when 'prospect'     then 'Prospect'
        when 'active'       then 'Customer 1'
        when 'loyal'        then 'Loyal'
        when 'blacklisted'  then 'Dump'
        else 'Suspect'
      end,
      r.assigned_to,
      r.notes,
      'Billing',
      r.area,
      null, -- old schema had no separate "town" field distinct from area
      r.pin,
      r.taluka,
      r.district,
      r.state
    )
    returning id into new_branch_id;

    update contacts
      set company_id = new_branch_id,
          is_primary = true,
          designation = r.job_title
      where id = r.id;

    -- Move any populated legacy phone columns into contact_phones.
    if r.mobile is not null and r.mobile <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'Mobile-1', r.mobile, 1);
    end if;
    if r.phone is not null and r.phone <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'Phone', r.phone, 2);
    end if;
    if r.phone_2 is not null and r.phone_2 <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'Phone-2', r.phone_2, 3);
    end if;
    if r.whatsapp is not null and r.whatsapp <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'WhatsApp', r.whatsapp, 4);
    end if;

  end loop;
end $$;
