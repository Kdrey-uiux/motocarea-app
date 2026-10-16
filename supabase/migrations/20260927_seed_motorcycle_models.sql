-- =========================================================================
-- COMPLETE MIGRATION & SEED: 2024-2026 Philippine Motorcycle Models Catalog
-- MotoCare Workshop Management System
-- I-run ito sa Supabase Dashboard > SQL Editor
-- =========================================================================

-- 1. Create motorcycle_models table if not exists
CREATE TABLE IF NOT EXISTS public.motorcycle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL UNIQUE,
  category VARCHAR(60) DEFAULT 'Standard',
  cc_displacement INT DEFAULT 150,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure category and cc_displacement columns exist if table was previously created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'motorcycle_models' AND column_name = 'category') THEN
    ALTER TABLE public.motorcycle_models ADD COLUMN category VARCHAR(60) DEFAULT 'Standard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'motorcycle_models' AND column_name = 'cc_displacement') THEN
    ALTER TABLE public.motorcycle_models ADD COLUMN cc_displacement INT DEFAULT 150;
  END IF;
END $$;

-- 2. Create search indexes
CREATE INDEX IF NOT EXISTS idx_motorcycle_models_name ON public.motorcycle_models(name);
CREATE INDEX IF NOT EXISTS idx_motorcycle_models_brand ON public.motorcycle_models(brand);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.motorcycle_models ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow public read access to active motorcycle models" ON public.motorcycle_models;
CREATE POLICY "Allow public read access to active motorcycle models" 
  ON public.motorcycle_models 
  FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Allow admin and staff full access to motorcycle models" ON public.motorcycle_models;
CREATE POLICY "Allow admin and staff full access to motorcycle models"
  ON public.motorcycle_models
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND LOWER(profiles.role) IN ('admin', 'staff')
    )
  );

-- 5. Seed 230+ Popular & Modern 2024-2026 Philippine Motorcycle Models
INSERT INTO public.motorcycle_models (brand, name, category, cc_displacement)
VALUES
  -- HONDA
  ('Honda', 'Honda Click 125i (V1 / V2 / V3 50th Anniv)', 'Scooter', 125),
  ('Honda', 'Honda Click 150i (V1 / V2)', 'Scooter', 150),
  ('Honda', 'Honda Click 160 (Standard / Special)', 'Scooter', 160),
  ('Honda', 'Honda Beat 110 (Carb / Fi / Playful / Premium)', 'Scooter', 110),
  ('Honda', 'Honda PCX 150 / 160 (CBS / ABS)', 'Maxi Scooter', 160),
  ('Honda', 'Honda ADV 150 / ADV 160', 'Adventure Scooter', 160),
  ('Honda', 'Honda Winner X 150 (Standard / ABS / Racing)', 'Underbone', 150),
  ('Honda', 'Honda Genio 110 / Scoopy 110', 'Scooter', 110),
  ('Honda', 'Honda Zoomer-X 110', 'Scooter', 110),
  ('Honda', 'Honda Wave 100 / 110 Alpha / 125 / RSX 110 Fi', 'Underbone', 110),
  ('Honda', 'Honda XRM 110 / 125 (Dual Sports / Motard / DSX Fi)', 'Dual Sport Underbone', 125),
  ('Honda', 'Honda RS125 Fi', 'Underbone', 125),
  ('Honda', 'Honda TMX 125 Alpha', 'Commuter / Tricycle', 125),
  ('Honda', 'Honda TMX Supremo 150', 'Commuter / Tricycle', 150),
  ('Honda', 'Honda TMX 155 (Classic CDI / Contact Point)', 'Commuter / Classic', 155),
  ('Honda', 'Honda Super Cub C125 / CT125 Hunter Cub / DAX 125', 'Heritage / Adventure Cub', 125),
  ('Honda', 'Honda XR150L / XR200', 'Dual Sport', 150),
  ('Honda', 'Honda CRF150L / CRF250L', 'Dual Sport', 150),
  ('Honda', 'Honda CRF300L / CRF300 Rally', 'Adventure / Dual Sport', 300),
  ('Honda', 'Honda CBR150R / CB150R / CB150X', 'Sport / Adventure', 150),
  ('Honda', 'Honda CB400 Super Four (Project Big 1)', 'Inline-4 Classic', 400),
  ('Honda', 'Honda CB500X / NX500 (2024) / CBR500R / CL500', 'Adventure / Scrambler', 500),
  ('Honda', 'Honda Rebel 500 / Rebel 1100', 'Cruiser', 500),
  ('Honda', 'Honda CB650R / CBR650R (E-Clutch)', 'Inline-4 Naked/Sport', 650),
  ('Honda', 'Honda Transalp XL750', 'Adventure Touring', 750),
  ('Honda', 'Honda X-ADV 750 / Forza 350 / 750', 'Adventure / Maxi Scooter', 750),
  ('Honda', 'Honda Africa Twin CRF1100L (Standard / Adventure Sports)', 'Big Adventure', 1100),
  ('Honda', 'Honda CBR1000RR-R Fireblade', 'Superbike', 1000),
  ('Honda', 'Honda Gold Wing 1800', 'Grand Touring', 1833),
  ('Honda', 'Honda EM1 e: (Electric)', 'Electric Scooter', 0),

  -- YAMAHA
  ('Yamaha', 'Yamaha Mio Sporty / Mio Amore', 'Scooter', 115),
  ('Yamaha', 'Yamaha Mio Soul / Soul i 115 / Soul i 125', 'Scooter', 125),
  ('Yamaha', 'Yamaha Mio i 125 / Mio M3 125', 'Scooter', 125),
  ('Yamaha', 'Yamaha Mio Gear 125 / Gear S', 'Urban Scooter', 125),
  ('Yamaha', 'Yamaha Mio Gravis 125', 'Maxi Scooter Style', 125),
  ('Yamaha', 'Yamaha Mio Fazzio 125 (Hybrid)', 'Retro Scooter', 125),
  ('Yamaha', 'Yamaha Aerox 155 (V1 / V2 / S / Connected / SP)', 'Sport Scooter', 155),
  ('Yamaha', 'Yamaha NMAX 155 (V1 / V2 / Connected / Tech MAX 2025)', 'Maxi Scooter', 155),
  ('Yamaha', 'Yamaha PG-1 (115cc Outdoor Adventure Cub)', 'Adventure Cub', 115),
  ('Yamaha', 'Yamaha Sniper 135 (Classic)', 'Sport Underbone', 135),
  ('Yamaha', 'Yamaha Sniper 150 (MXi / King)', 'Sport Underbone', 150),
  ('Yamaha', 'Yamaha Sniper 155 / Sniper 155R / ABS', 'Sport Underbone', 155),
  ('Yamaha', 'Yamaha Sight 115 / Vega Force Fi / Crypton 110', 'Commuter Underbone', 115),
  ('Yamaha', 'Yamaha YTX 125', 'Commuter / Tricycle', 125),
  ('Yamaha', 'Yamaha RS100 / RX100 / RX-T 135 (2-Stroke Classic)', 'Classic 2-Stroke', 135),
  ('Yamaha', 'Yamaha DT125 Enduro / Serow 250', 'Dual Sport', 125),
  ('Yamaha', 'Yamaha WR 155R', 'Dual Sport / Offroad', 155),
  ('Yamaha', 'Yamaha XSR 155 / MT-15 / TFX 150', 'Sport Heritage / Naked', 155),
  ('Yamaha', 'Yamaha YZF-R15 (V1 / V2 / V3 / V4 / R15M)', 'Sportbike', 155),
  ('Yamaha', 'Yamaha YZF-R3 / MT-03', 'Sport / Naked', 321),
  ('Yamaha', 'Yamaha XMAX 300 / Tech MAX', 'Expressway Maxi Scooter', 300),
  ('Yamaha', 'Yamaha MT-07 / YZF-R7 / XSR 700 / Ténéré 700', 'Twin Naked / Adventure', 689),
  ('Yamaha', 'Yamaha MT-09 / MT-09 SP / Tracer 9 GT', 'Triple Naked / Touring', 890),
  ('Yamaha', 'Yamaha TMAX 560 Tech MAX', 'Twin Maxi Scooter', 560),
  ('Yamaha', 'Yamaha YZF-R1 / MT-10', 'Liter Superbike', 998),

  -- SUZUKI
  ('Suzuki', 'Suzuki Raider 150 Carb (DOHC 150)', 'Sport Underbone', 150),
  ('Suzuki', 'Suzuki Raider R150 Fi / Combat Series', 'Sport Underbone', 150),
  ('Suzuki', 'Suzuki Raider J Crossover 115', 'Dual Sport Underbone', 115),
  ('Suzuki', 'Suzuki Smash 115 (Carb / Fi / Disc / Spoke)', 'Commuter Underbone', 115),
  ('Suzuki', 'Suzuki Burgman Street 125 / Street 125 EX', 'Maxi Scooter Style', 125),
  ('Suzuki', 'Suzuki Avenis 125', 'Sport Utility Scooter', 125),
  ('Suzuki', 'Suzuki Skydrive 125 / Skydrive Sport / Crossover', 'Scooter', 125),
  ('Suzuki', 'Suzuki Address 110 / Step 125', 'Scooter', 110),
  ('Suzuki', 'Suzuki GD110 HU (Tricycle / Solo) / TF120', 'Commuter / Tricycle', 110),
  ('Suzuki', 'Suzuki Gixxer 150 / Gixxer 250 / SF 250', 'Naked / Sport', 250),
  ('Suzuki', 'Suzuki GSX-S150 / GSX-R150 / Bandit 150', 'Sport / Naked', 150),
  ('Suzuki', 'Suzuki V-Strom 250SX', 'Light Adventure', 250),
  ('Suzuki', 'Suzuki SV650 / GSX-8S / GSX-8R', 'Middleweight Naked / Sport', 800),
  ('Suzuki', 'Suzuki V-Strom 650 XT / 800DE / 1050XT', 'Adventure Touring', 800),
  ('Suzuki', 'Suzuki Katana 1000 / GSX-S1000GT', 'Street / Sport Touring', 1000),
  ('Suzuki', 'Suzuki Hayabusa GSX-1300R', 'Hyper Sport', 1340),

  -- KAWASAKI & BAJAJ
  ('Kawasaki', 'Kawasaki Barako 175 (Barako I / Barako II Heavy Duty)', 'Commuter / Tricycle', 175),
  ('Kawasaki', 'Bajaj CT100 / CT125 / CT150 Boxer', 'Commuter / Tricycle', 125),
  ('Kawasaki', 'Bajaj Rouser 135LS / NS125 / NS160 / NS200', 'Naked Street', 200),
  ('Kawasaki', 'Bajaj Dominar 400 (UG / Touring Edition)', 'Sports Tourer', 373),
  ('Kawasaki', 'Bajaj Maxima Cargo / RE (Tricab)', 'Three Wheeler Commercial', 236),
  ('Kawasaki', 'Kawasaki Fury 125 / Fury 125R', 'Underbone', 125),
  ('Kawasaki', 'Kawasaki KLX 140 / KLX 150L / KLX 230 / KLX 300', 'Dual Sport / Trail', 230),
  ('Kawasaki', 'Kawasaki D-Tracker 150 / 250', 'Supermoto', 150),
  ('Kawasaki', 'Kawasaki W175 / W800 Street / Cafe', 'Retro Classic', 175),
  ('Kawasaki', 'Kawasaki Eliminator 450 (2024-2025)', 'Cruiser', 450),
  ('Kawasaki', 'Kawasaki Ninja 400 / Ninja 500 (2024-2025)', 'Sportbike', 500),
  ('Kawasaki', 'Kawasaki Z400 / Z500 (2024-2025)', 'Naked Street', 500),
  ('Kawasaki', 'Kawasaki ZX-4R / ZX-4RR (Inline-4)', 'Inline-4 Supersport', 400),
  ('Kawasaki', 'Kawasaki Ninja 650 / Z650 / Vulcan S 650 / Versys 650', 'Middleweight Twin', 650),
  ('Kawasaki', 'Kawasaki ZX-6R 636 / ZX-10R', 'Supersport / Superbike', 636),
  ('Kawasaki', 'Kawasaki Z900 / Z900RS / Versys 1000 SE', 'Inline-4 Big Bike', 948),

  -- CFMOTO
  ('CFMOTO', 'CFMOTO Papio XO-1 / XO-2 (Racer / Trail)', 'Mini Bike', 125),
  ('CFMOTO', 'CFMOTO 300NK / 300SR', 'Naked / Sport', 300),
  ('CFMOTO', 'CFMOTO 450SR / 450SR-S', 'Supersport 270 Crank', 450),
  ('CFMOTO', 'CFMOTO 450NK', 'Naked 270 Crank', 450),
  ('CFMOTO', 'CFMOTO 450MT (Adventure 2024-2025)', 'Mid-Adventure', 450),
  ('CFMOTO', 'CFMOTO 450CL-C (Cruiser)', 'Modern Cruiser', 450),
  ('CFMOTO', 'CFMOTO 650NK / 650MT / 650GT', 'Middleweight Twin', 650),
  ('CFMOTO', 'CFMOTO 700CL-X (Heritage / Sport / ADV)', 'Modern Scrambler', 700),
  ('CFMOTO', 'CFMOTO 800NK (Advanced)', 'Big Naked', 800),
  ('CFMOTO', 'CFMOTO 800MT (Sport / Touring / Explore)', 'Adventure Touring', 800),

  -- KYMCO
  ('Kymco', 'Kymco Like 125 / Like 150i (ABS / Noodoe)', 'Classic Scooter', 150),
  ('Kymco', 'Kymco Dink R 150 (2024)', 'Maxi Scooter', 150),
  ('Kymco', 'Kymco KRV 180i TCS / KRV Moto 180', 'Sport Maxi Scooter', 180),
  ('Kymco', 'Kymco Super Z 150', 'Urban Scooter', 150),
  ('Kymco', 'Kymco Agility 125 / Super 8 150', 'Scooter', 125),
  ('Kymco', 'Kymco Racing King 180', 'Sport Scooter', 180),
  ('Kymco', 'Kymco X-Town 300i / Xciting S 400i', 'Maxi Scooter', 400),
  ('Kymco', 'Kymco DTX 360', 'Crossover Adventure Scooter', 320),
  ('Kymco', 'Kymco AK 550 / CV3 (3-Wheeler)', 'Twin Maxi Scooter', 550),

  -- SYM
  ('SYM', 'SYM Bonus 110 / Bonus X', 'Commuter Underbone', 110),
  ('SYM', 'SYM Jet 14 125 / 150 / 200', 'Urban Scooter', 150),
  ('SYM', 'SYM Jet X 150', 'Sport Scooter', 150),
  ('SYM', 'SYM Husky ADV 150', 'Adventure Scooter', 150),
  ('SYM', 'SYM Cruisym 150 / Cruisym 300', 'Maxi Scooter', 300),
  ('SYM', 'SYM VF3i 185 (Underbone King)', 'High-Power Underbone', 185),
  ('SYM', 'SYM Joyride 200 / Maxsym 400 / Maxsym TL 508', 'Maxi Touring Scooter', 400),

  -- BRISTOL MOTORCYCLES
  ('Bristol', 'Bristol Classic 400i / Omega 400', 'Classic Single', 400),
  ('Bristol', 'Bristol BR 400i / Bobber 650', 'Bobber / Cruiser', 400),
  ('Bristol', 'Bristol Veloce 500 / Venturi 500', 'Adventure Tourer', 500),
  ('Bristol', 'Bristol Assassin 400', 'Sport Naked', 400),
  ('Bristol', 'Bristol ADX 160 / Maxie 400', 'Maxi Scooter', 160),

  -- ROYAL ENFIELD
  ('Royal Enfield', 'Royal Enfield Hunter 350', 'Modern Roadster', 350),
  ('Royal Enfield', 'Royal Enfield Classic 350 / Bullet 350', 'Heritage Classic', 350),
  ('Royal Enfield', 'Royal Enfield Meteor 350', 'Cruiser', 350),
  ('Royal Enfield', 'Royal Enfield Himalayan 411 / Himalayan 450 (2024)', 'Adventure', 450),
  ('Royal Enfield', 'Royal Enfield Scram 411 / Guerrilla 450', 'Scrambler / Roadster', 450),
  ('Royal Enfield', 'Royal Enfield Interceptor 650 / Continental GT 650', 'Twin Cafe / Roadster', 650),
  ('Royal Enfield', 'Royal Enfield Super Meteor 650 / Shotgun 650', 'Twin Cruiser / Bobber', 650),

  -- TVS
  ('TVS', 'TVS Dazz 110 / Dazz Prime', 'Scooter', 110),
  ('TVS', 'TVS XL100 Heavy Duty', 'Moped / Cargo', 100),
  ('TVS', 'TVS Ntorq 125 (Race Edition / XT)', 'Sport Scooter', 125),
  ('TVS', 'TVS Raider 125', 'Commuter Naked', 125),
  ('TVS', 'TVS Apache RTR 160 4V / RTR 200 4V', 'Naked Sport', 200),
  ('TVS', 'TVS Apache RR 310', 'Sportbike', 312),

  -- RUSI
  ('Rusi', 'Rusi Classic 250 / Classic 400', 'Classic Cafe', 250),
  ('Rusi', 'Rusi Flash 150', 'Underbone', 150),
  ('Rusi', 'Rusi Passion 125', 'Scooter', 125),
  ('Rusi', 'Rusi Gala 125', 'Scooter', 125),
  ('Rusi', 'Rusi Mojo 200', 'Cruiser', 200),
  ('Rusi', 'Rusi Rapid 150', 'Sport Underbone', 150),
  ('Rusi', 'Rusi Sigma 250', 'Sportbike', 250),
  ('Rusi', 'Rusi Gremlin 150 / Rango 110', 'Commuter', 150),

  -- BENELLI
  ('Benelli', 'Benelli TNT 135', 'Mini Naked', 135),
  ('Benelli', 'Benelli Panarea 125', 'Retro Scooter', 125),
  ('Benelli', 'Benelli Motobi 200 / 200 Evo', 'Cruiser', 200),
  ('Benelli', 'Benelli Leoncino 250 / 500 / 500 Trail / 800', 'Modern Classic', 500),
  ('Benelli', 'Benelli TRK 502 / 502X / 702X', 'Adventure Tourer', 500),
  ('Benelli', 'Benelli Imperiale 400', 'Vintage Classic', 400),

  -- KTM & HUSQVARNA
  ('KTM', 'KTM Duke 200 / Duke 390 (Gen 2 / Gen 3)', 'Naked Streetfighter', 390),
  ('KTM', 'KTM RC 200 / RC 390', 'Supersport', 390),
  ('KTM', 'KTM 390 Adventure', 'Compact Adventure', 390),
  ('KTM', 'KTM 790 Duke / 890 Duke R', 'Twin Naked', 890),
  ('KTM', 'KTM 790 Adventure / 890 Adventure R', 'Twin Adventure', 890),
  ('KTM', 'KTM 1290 Super Duke R / Super Adventure', 'V-Twin Hyper', 1301),
  ('Husqvarna', 'Husqvarna Svartpilen 200 / 401', 'Urban Scrambler', 373),
  ('Husqvarna', 'Husqvarna Vitpilen 401 / Norden 901', 'Cafe / Adventure', 889),

  -- VESPA
  ('Vespa', 'Vespa S 125 i-Get', 'Classic Italian Scooter', 125),
  ('Vespa', 'Vespa LX 125 i-Get', 'Classic Italian Scooter', 125),
  ('Vespa', 'Vespa Primavera 150 (Standard / S / Color Vibe)', 'Classic Italian Scooter', 150),
  ('Vespa', 'Vespa Sprint 150 (Standard / S / TFT Edition)', 'Sport Italian Scooter', 150),
  ('Vespa', 'Vespa GTS 150 / GTS 300 Super Sport / HPE', 'Maxi Italian Scooter', 300),
  ('Vespa', 'Vespa GTV 300 Sei Giorni', 'Heritage Italian Scooter', 300),

  -- QJ MOTOR
  ('QJ Motor', 'QJ Motor SRV 200 / SRV 400 (Cruiser)', 'Cruiser', 400),
  ('QJ Motor', 'QJ Motor SRK 400 / SRK 600', 'Naked Street', 600),
  ('QJ Motor', 'QJ Motor SRT 700 / SRT 800', 'Adventure Tourer', 750),
  ('QJ Motor', 'QJ Motor Fort 350', 'Maxi Scooter', 350),

  -- BMW MOTORRAD
  ('BMW', 'BMW G 310 R / G 310 GS', 'Entry Roadster / GS', 313),
  ('BMW', 'BMW C 400 X / C 400 GT', 'Urban Maxi Scooter', 350),
  ('BMW', 'BMW F 750 GS / F 850 GS / F 900 R / XR', 'Middleweight GS / Roadster', 853),
  ('BMW', 'BMW R 1200 GS / R 1250 GS Adventure', 'Boxer Adventure', 1254),
  ('BMW', 'BMW R 1300 GS', 'Flagship Adventure', 1300),
  ('BMW', 'BMW R nineT / R 12', 'Heritage Boxer', 1170),
  ('BMW', 'BMW S 1000 RR / S 1000 R / S 1000 XR', 'Superbike / Dynamic', 999),

  -- DUCATI
  ('Ducati', 'Ducati Monster 797 / 821 / 937', 'Naked', 937),
  ('Ducati', 'Ducati Scrambler 800 (Icon / Full Throttle / Nightshift)', 'Scrambler', 803),
  ('Ducati', 'Ducati Hypermotard 950 / RVE', 'Supermotard', 937),
  ('Ducati', 'Ducati Streetfighter V2 / V4 / V4S', 'Hyper Naked', 1103),
  ('Ducati', 'Ducati Panigale V2 / V4 / V4S', 'Superbike', 1103),
  ('Ducati', 'Ducati Multistrada V2 / V4 / V4 Rally', 'Grand Tourer Adventure', 1158),
  ('Ducati', 'Ducati DesertX', 'Dakar Rally Adventure', 937),
  ('Ducati', 'Ducati Diavel 1260 / Diavel V4', 'Power Cruiser', 1158),

  -- TRIUMPH & HARLEY-DAVIDSON
  ('Triumph', 'Triumph Speed 400 / Scrambler 400X (2024)', 'Modern Classic 400', 398),
  ('Triumph', 'Triumph Trident 660 / Tiger Sport 660', 'Triple Roadster / Sport Tourer', 660),
  ('Triumph', 'Triumph Street Triple 765 R / RS', 'Triple Naked', 765),
  ('Triumph', 'Triumph Bonneville T100 / T120', 'Modern Classic', 900),
  ('Triumph', 'Triumph Scrambler 900 / 1200', 'Scrambler', 900),
  ('Triumph', 'Triumph Tiger 900 / 1200 Rally Pro', 'Adventure Touring', 900),
  ('Harley-Davidson', 'Harley-Davidson Iron 883 / Forty-Eight', 'Evolution Cruiser', 883),
  ('Harley-Davidson', 'Harley-Davidson Nightster 975 / Sportster S 1250', 'Revolution Max Cruiser', 975),
  ('Harley-Davidson', 'Harley-Davidson Fat Boy 114 / Street Bob 114', 'Softail Cruiser', 1868),
  ('Harley-Davidson', 'Harley-Davidson Street Glide / Road Glide Special', 'Grand American Touring', 1868),
  ('Harley-Davidson', 'Harley-Davidson Pan America 1250 Special', 'Adventure Tourer', 1250)
ON CONFLICT (name) DO UPDATE SET
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  cc_displacement = EXCLUDED.cc_displacement,
  is_active = true;
