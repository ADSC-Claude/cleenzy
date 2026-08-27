-- ---------------------------------------------------------------------------
-- 0009 — Website visibility switch
--
-- Lets the owner take the customer-facing site off the air without a redeploy:
-- while status is 'coming_soon' the public pages render a holding page instead.
-- Signed-in staff always see the real site, so the shop can rehearse the whole
-- flow before opening it to customers.
--
-- is_public = true because the site layout reads this row as anon on every
-- request; it carries no business data worth hiding.
-- ---------------------------------------------------------------------------

insert into public.settings (key, value, is_public) values
  ('site', jsonb_build_object(
      'status',   'coming_soon',
      'headline', 'Something fresh is coming.',
      'message',  'Cleenzy is getting its last load ready. Pickup and delivery bookings open soon.'
    ), true)
on conflict (key) do nothing;
