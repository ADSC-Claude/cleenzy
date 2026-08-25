-- Cleenzy — special-request add-ons: preferred detergent, fabric conditioner.
-- Priced per load; the owner adjusts prices in Admin › Services like any
-- other service. Customers name the brand in the booking notes.

insert into public.services (name, slug, description, price, unit, turnaround_hours, min_quantity, icon, sort_order) values
  ('Choose Your Detergent', 'choose-your-detergent',
   'We wash with your preferred detergent brand — just name it in the booking notes, or hand your own to the rider.',
   30.00, 'per_load', 24, 1, 'droplets', 9),
  ('Fabric Conditioner (Fabcon)', 'fabric-conditioner',
   'An extra-fresh finish with the fabcon of your choice. Tell us the brand in the booking notes.',
   25.00, 'per_load', 24, 1, 'sparkles', 10)
on conflict (slug) do nothing;
