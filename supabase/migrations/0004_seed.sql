-- Cleenzy — starting catalogue and business configuration.
-- Everything here is editable from Admin › Services and Admin › Settings.

insert into public.services (name, slug, description, price, unit, turnaround_hours, min_quantity, icon, sort_order) values
  ('Wash & Fold',        'wash-fold',       'Everyday clothes machine-washed, air-dried and neatly folded.',        80.00,  'per_kg',    24, 3, 'shirt',    1),
  ('Wash, Dry & Fold',   'wash-dry-fold',   'Machine wash plus heated tumble dry — best for rainy days.',          100.00, 'per_kg',    24, 3, 'wind',     2),
  ('Dry Cleaning',       'dry-cleaning',    'Solvent cleaning for barongs, suits, gowns and delicate fabrics.',    350.00, 'per_piece', 72, 1, 'sparkles', 3),
  ('Comforter / Blanket','comforter',       'Bulky bedding washed in industrial machines and thoroughly dried.',   250.00, 'per_piece', 48, 1, 'bed',      4),
  ('Curtains',           'curtains',        'Household curtains and drapes, washed and pressed ready to re-hang.', 150.00, 'per_piece', 72, 1, 'blinds',   5),
  ('Shoes / Bags',       'shoes-bags',      'Deep cleaning and deodorising for sneakers, leather shoes and bags.', 200.00, 'per_pair',  72, 1, 'footprints', 6),
  ('Ironing',            'ironing',         'Press-only service for clothes already washed at home.',               60.00,  'per_kg',    24, 2, 'flame',    7),
  ('Special Items',      'special-items',   'Uniforms, gowns, costumes and anything needing extra care.',          300.00, 'per_piece', 72, 1, 'star',     8);

insert into public.time_slots (label, start_time, end_time, slot_type, capacity, sort_order) values
  ('8:00 AM – 10:00 AM',  '08:00', '10:00', 'both', 20, 1),
  ('10:00 AM – 12:00 NN', '10:00', '12:00', 'both', 20, 2),
  ('1:00 PM – 3:00 PM',   '13:00', '15:00', 'both', 20, 3),
  ('3:00 PM – 5:00 PM',   '15:00', '17:00', 'both', 20, 4),
  ('5:00 PM – 7:00 PM',   '17:00', '19:00', 'both', 15, 5);

insert into public.service_areas (name, city, pickup_fee, delivery_fee, min_order_amount, free_delivery_over, sort_order) values
  ('Poblacion',        'Makati City',      50.00, 50.00, 300.00, 1000.00, 1),
  ('Bel-Air',          'Makati City',      50.00, 50.00, 300.00, 1000.00, 2),
  ('Barangka',         'Mandaluyong City', 60.00, 60.00, 300.00, 1200.00, 3),
  ('Wack-Wack',        'Mandaluyong City', 60.00, 60.00, 300.00, 1200.00, 4),
  ('Kapitolyo',        'Pasig City',       60.00, 60.00, 300.00, 1200.00, 5),
  ('Ortigas Center',   'Pasig City',       70.00, 70.00, 400.00, 1500.00, 6),
  ('Cubao',            'Quezon City',      80.00, 80.00, 400.00, 1500.00, 7),
  ('Diliman',          'Quezon City',      80.00, 80.00, 400.00, 1500.00, 8);

insert into public.settings (key, value, is_public) values
  ('business',   jsonb_build_object(
      'name', 'Cleenzy',
      'tagline', 'Fresh laundry, picked up and delivered.',
      'phone', '+63 917 000 0000',
      'email', 'hello@cleenzy.ph',
      'address', '123 Kalayaan Avenue, Poblacion, Makati City',
      'hours', 'Mon–Sat, 8:00 AM – 7:00 PM'
    ), true),
  ('payments',   jsonb_build_object(
      'gcash_name', 'Cleenzy Laundry Services',
      'gcash_number', '0917 000 0000',
      'bank_name', 'BPI',
      'bank_account_name', 'Cleenzy Laundry Services',
      'bank_account_number', '0000-0000-00',
      'card_enabled', false
    ), true),
  ('operations', jsonb_build_object(
      'default_pickup_fee', 50,
      'default_delivery_fee', 50,
      'free_delivery_over', 1000,
      'min_lead_hours', 4,
      'standard_turnaround_hours', 24
    ), true),
  ('notifications', jsonb_build_object(
      'email_enabled', true,
      'sms_enabled', false
    ), false);
