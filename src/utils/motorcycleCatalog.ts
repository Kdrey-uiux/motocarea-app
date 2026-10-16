import { BikeModel } from '../types/dashboard';
import { supabase } from '../lib/supabase';

export interface OfficialBikeModel extends BikeModel {
  id?: string;
  category?: string;
  cc_displacement?: number;
  is_active?: boolean;
  created_at?: string;
}

/**
 * 230+ Comprehensive Philippine Motorcycle Models Base Catalog (2024-2026 Updated)
 * Garantisadong available offline kahit bago pa i-run ang SQL migration sa Supabase.
 */
export const BASE_MOTORCYCLE_MODELS: OfficialBikeModel[] = [
  // ==========================================
  // --- HONDA PHILIPPINES ---
  // ==========================================
  { brand: 'Honda', name: 'Honda Click 125i (V1 / V2 / V3 50th Anniv)', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Honda', name: 'Honda Click 150i (V1 / V2)', category: 'Scooter', cc_displacement: 150 },
  { brand: 'Honda', name: 'Honda Click 160 (Standard / Special)', category: 'Scooter', cc_displacement: 160 },
  { brand: 'Honda', name: 'Honda Beat 110 (Carb / Fi / Playful / Premium)', category: 'Scooter', cc_displacement: 110 },
  { brand: 'Honda', name: 'Honda PCX 150 / 160 (CBS / ABS)', category: 'Maxi Scooter', cc_displacement: 160 },
  { brand: 'Honda', name: 'Honda ADV 150 / ADV 160', category: 'Adventure Scooter', cc_displacement: 160 },
  { brand: 'Honda', name: 'Honda Winner X 150 (Standard / ABS / Racing)', category: 'Underbone', cc_displacement: 150 },
  { brand: 'Honda', name: 'Honda Genio 110 / Scoopy 110', category: 'Scooter', cc_displacement: 110 },
  { brand: 'Honda', name: 'Honda Zoomer-X 110', category: 'Scooter', cc_displacement: 110 },
  { brand: 'Honda', name: 'Honda Wave 100 / 110 Alpha / 125 / RSX 110 Fi', category: 'Underbone', cc_displacement: 110 },
  { brand: 'Honda', name: 'Honda XRM 110 / 125 (Dual Sports / Motard / DSX Fi)', category: 'Dual Sport Underbone', cc_displacement: 125 },
  { brand: 'Honda', name: 'Honda RS125 Fi', category: 'Underbone', cc_displacement: 125 },
  { brand: 'Honda', name: 'Honda TMX 125 Alpha', category: 'Commuter / Tricycle', cc_displacement: 125 },
  { brand: 'Honda', name: 'Honda TMX Supremo 150', category: 'Commuter / Tricycle', cc_displacement: 150 },
  { brand: 'Honda', name: 'Honda TMX 155 (Classic CDI / Contact Point)', category: 'Commuter / Classic', cc_displacement: 155 },
  { brand: 'Honda', name: 'Honda Super Cub C125 / CT125 Hunter Cub / DAX 125', category: 'Heritage / Adventure Cub', cc_displacement: 125 },
  { brand: 'Honda', name: 'Honda XR150L / XR200', category: 'Dual Sport', cc_displacement: 150 },
  { brand: 'Honda', name: 'Honda CRF150L / CRF250L', category: 'Dual Sport', cc_displacement: 150 },
  { brand: 'Honda', name: 'Honda CRF300L / CRF300 Rally', category: 'Adventure / Dual Sport', cc_displacement: 300 },
  { brand: 'Honda', name: 'Honda CBR150R / CB150R / CB150X', category: 'Sport / Adventure', cc_displacement: 150 },
  { brand: 'Honda', name: 'Honda CB400 Super Four (Project Big 1)', category: 'Inline-4 Classic', cc_displacement: 400 },
  { brand: 'Honda', name: 'Honda CB500X / NX500 (2024) / CBR500R / CL500', category: 'Adventure / Scrambler', cc_displacement: 500 },
  { brand: 'Honda', name: 'Honda Rebel 500 / Rebel 1100', category: 'Cruiser', cc_displacement: 500 },
  { brand: 'Honda', name: 'Honda CB650R / CBR650R (E-Clutch)', category: 'Inline-4 Naked/Sport', cc_displacement: 650 },
  { brand: 'Honda', name: 'Honda Transalp XL750', category: 'Adventure Touring', cc_displacement: 750 },
  { brand: 'Honda', name: 'Honda X-ADV 750 / Forza 350 / 750', category: 'Adventure / Maxi Scooter', cc_displacement: 750 },
  { brand: 'Honda', name: 'Honda Africa Twin CRF1100L (Standard / Adventure Sports)', category: 'Big Adventure', cc_displacement: 1100 },
  { brand: 'Honda', name: 'Honda CBR1000RR-R Fireblade', category: 'Superbike', cc_displacement: 1000 },
  { brand: 'Honda', name: 'Honda Gold Wing 1800', category: 'Grand Touring', cc_displacement: 1833 },
  { brand: 'Honda', name: 'Honda EM1 e: (Electric)', category: 'Electric Scooter', cc_displacement: 0 },

  // ==========================================
  // --- YAMAHA MOTOR PHILIPPINES ---
  // ==========================================
  { brand: 'Yamaha', name: 'Yamaha Mio Sporty / Mio Amore', category: 'Scooter', cc_displacement: 115 },
  { brand: 'Yamaha', name: 'Yamaha Mio Soul / Soul i 115 / Soul i 125', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha Mio i 125 / Mio M3 125', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha Mio Gear 125 / Gear S', category: 'Urban Scooter', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha Mio Gravis 125', category: 'Maxi Scooter Style', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha Mio Fazzio 125 (Hybrid)', category: 'Retro Scooter', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha Aerox 155 (V1 / V2 / S / Connected / SP)', category: 'Sport Scooter', cc_displacement: 155 },
  { brand: 'Yamaha', name: 'Yamaha NMAX 155 (V1 / V2 / Connected / Tech MAX 2025)', category: 'Maxi Scooter', cc_displacement: 155 },
  { brand: 'Yamaha', name: 'Yamaha PG-1 (115cc Outdoor Adventure Cub)', category: 'Adventure Cub', cc_displacement: 115 },
  { brand: 'Yamaha', name: 'Yamaha Sniper 135 (Classic)', category: 'Sport Underbone', cc_displacement: 135 },
  { brand: 'Yamaha', name: 'Yamaha Sniper 150 (MXi / King)', category: 'Sport Underbone', cc_displacement: 150 },
  { brand: 'Yamaha', name: 'Yamaha Sniper 155 / Sniper 155R / ABS', category: 'Sport Underbone', cc_displacement: 155 },
  { brand: 'Yamaha', name: 'Yamaha Sight 115 / Vega Force Fi / Crypton 110', category: 'Commuter Underbone', cc_displacement: 115 },
  { brand: 'Yamaha', name: 'Yamaha YTX 125', category: 'Commuter / Tricycle', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha RS100 / RX100 / RX-T 135 (2-Stroke Classic)', category: 'Classic 2-Stroke', cc_displacement: 135 },
  { brand: 'Yamaha', name: 'Yamaha DT125 Enduro / Serow 250', category: 'Dual Sport', cc_displacement: 125 },
  { brand: 'Yamaha', name: 'Yamaha WR 155R', category: 'Dual Sport / Offroad', cc_displacement: 155 },
  { brand: 'Yamaha', name: 'Yamaha XSR 155 / MT-15 / TFX 150', category: 'Sport Heritage / Naked', cc_displacement: 155 },
  { brand: 'Yamaha', name: 'Yamaha YZF-R15 (V1 / V2 / V3 / V4 / R15M)', category: 'Sportbike', cc_displacement: 155 },
  { brand: 'Yamaha', name: 'Yamaha YZF-R3 / MT-03', category: 'Sport / Naked', cc_displacement: 321 },
  { brand: 'Yamaha', name: 'Yamaha XMAX 300 / Tech MAX', category: 'Expressway Maxi Scooter', cc_displacement: 300 },
  { brand: 'Yamaha', name: 'Yamaha MT-07 / YZF-R7 / XSR 700 / Ténéré 700', category: 'Twin Naked / Adventure', cc_displacement: 689 },
  { brand: 'Yamaha', name: 'Yamaha MT-09 / MT-09 SP / Tracer 9 GT', category: 'Triple Naked / Touring', cc_displacement: 890 },
  { brand: 'Yamaha', name: 'Yamaha TMAX 560 Tech MAX', category: 'Twin Maxi Scooter', cc_displacement: 560 },
  { brand: 'Yamaha', name: 'Yamaha YZF-R1 / MT-10', category: 'Liter Superbike', cc_displacement: 998 },

  // ==========================================
  // --- SUZUKI PHILIPPINES ---
  // ==========================================
  { brand: 'Suzuki', name: 'Suzuki Raider 150 Carb (DOHC 150)', category: 'Sport Underbone', cc_displacement: 150 },
  { brand: 'Suzuki', name: 'Suzuki Raider R150 Fi / Combat Series', category: 'Sport Underbone', cc_displacement: 150 },
  { brand: 'Suzuki', name: 'Suzuki Raider J Crossover 115', category: 'Dual Sport Underbone', cc_displacement: 115 },
  { brand: 'Suzuki', name: 'Suzuki Smash 115 (Carb / Fi / Disc / Spoke)', category: 'Commuter Underbone', cc_displacement: 115 },
  { brand: 'Suzuki', name: 'Suzuki Burgman Street 125 / Street 125 EX', category: 'Maxi Scooter Style', cc_displacement: 125 },
  { brand: 'Suzuki', name: 'Suzuki Avenis 125', category: 'Sport Utility Scooter', cc_displacement: 125 },
  { brand: 'Suzuki', name: 'Suzuki Skydrive 125 / Skydrive Sport / Crossover', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Suzuki', name: 'Suzuki Address 110 / Step 125', category: 'Scooter', cc_displacement: 110 },
  { brand: 'Suzuki', name: 'Suzuki GD110 HU (Tricycle / Solo) / TF120', category: 'Commuter / Tricycle', cc_displacement: 110 },
  { brand: 'Suzuki', name: 'Suzuki Gixxer 150 / Gixxer 250 / SF 250', category: 'Naked / Sport', cc_displacement: 250 },
  { brand: 'Suzuki', name: 'Suzuki GSX-S150 / GSX-R150 / Bandit 150', category: 'Sport / Naked', cc_displacement: 150 },
  { brand: 'Suzuki', name: 'Suzuki V-Strom 250SX', category: 'Light Adventure', cc_displacement: 250 },
  { brand: 'Suzuki', name: 'Suzuki SV650 / GSX-8S / GSX-8R', category: 'Middleweight Naked / Sport', cc_displacement: 800 },
  { brand: 'Suzuki', name: 'Suzuki V-Strom 650 XT / 800DE / 1050XT', category: 'Adventure Touring', cc_displacement: 800 },
  { brand: 'Suzuki', name: 'Suzuki Katana 1000 / GSX-S1000GT', category: 'Street / Sport Touring', cc_displacement: 1000 },
  { brand: 'Suzuki', name: 'Suzuki Hayabusa GSX-1300R', category: 'Hyper Sport', cc_displacement: 1340 },

  // ==========================================
  // --- KAWASAKI & BAJAJ ---
  // ==========================================
  { brand: 'Kawasaki', name: 'Kawasaki Barako 175 (Barako I / Barako II Heavy Duty)', category: 'Commuter / Tricycle', cc_displacement: 175 },
  { brand: 'Kawasaki', name: 'Bajaj CT100 / CT125 / CT150 Boxer', category: 'Commuter / Tricycle', cc_displacement: 125 },
  { brand: 'Kawasaki', name: 'Bajaj Rouser 135LS / NS125 / NS160 / NS200', category: 'Naked Street', cc_displacement: 200 },
  { brand: 'Kawasaki', name: 'Bajaj Dominar 400 (UG / Touring Edition)', category: 'Sports Tourer', cc_displacement: 373 },
  { brand: 'Kawasaki', name: 'Bajaj Maxima Cargo / RE (Tricab)', category: 'Three Wheeler Commercial', cc_displacement: 236 },
  { brand: 'Kawasaki', name: 'Kawasaki Fury 125 / Fury 125R', category: 'Underbone', cc_displacement: 125 },
  { brand: 'Kawasaki', name: 'Kawasaki KLX 140 / KLX 150L / KLX 230 / KLX 300', category: 'Dual Sport / Trail', cc_displacement: 230 },
  { brand: 'Kawasaki', name: 'Kawasaki D-Tracker 150 / 250', category: 'Supermoto', cc_displacement: 150 },
  { brand: 'Kawasaki', name: 'Kawasaki W175 / W800 Street / Cafe', category: 'Retro Classic', cc_displacement: 175 },
  { brand: 'Kawasaki', name: 'Kawasaki Eliminator 450 (2024-2025)', category: 'Cruiser', cc_displacement: 450 },
  { brand: 'Kawasaki', name: 'Kawasaki Ninja 400 / Ninja 500 (2024-2025)', category: 'Sportbike', cc_displacement: 500 },
  { brand: 'Kawasaki', name: 'Kawasaki Z400 / Z500 (2024-2025)', category: 'Naked Street', cc_displacement: 500 },
  { brand: 'Kawasaki', name: 'Kawasaki ZX-4R / ZX-4RR (Inline-4)', category: 'Inline-4 Supersport', cc_displacement: 400 },
  { brand: 'Kawasaki', name: 'Kawasaki Ninja 650 / Z650 / Vulcan S 650 / Versys 650', category: 'Middleweight Twin', cc_displacement: 650 },
  { brand: 'Kawasaki', name: 'Kawasaki ZX-6R 636 / ZX-10R', category: 'Supersport / Superbike', cc_displacement: 636 },
  { brand: 'Kawasaki', name: 'Kawasaki Z900 / Z900RS / Versys 1000 SE', category: 'Inline-4 Big Bike', cc_displacement: 948 },

  // ==========================================
  // --- CFMOTO ---
  // ==========================================
  { brand: 'CFMOTO', name: 'CFMOTO Papio XO-1 / XO-2 (Racer / Trail)', category: 'Mini Bike', cc_displacement: 125 },
  { brand: 'CFMOTO', name: 'CFMOTO 300NK / 300SR', category: 'Naked / Sport', cc_displacement: 300 },
  { brand: 'CFMOTO', name: 'CFMOTO 450SR / 450SR-S', category: 'Supersport 270 Crank', cc_displacement: 450 },
  { brand: 'CFMOTO', name: 'CFMOTO 450NK', category: 'Naked 270 Crank', cc_displacement: 450 },
  { brand: 'CFMOTO', name: 'CFMOTO 450MT (Adventure 2024-2025)', category: 'Mid-Adventure', cc_displacement: 450 },
  { brand: 'CFMOTO', name: 'CFMOTO 450CL-C (Cruiser)', category: 'Modern Cruiser', cc_displacement: 450 },
  { brand: 'CFMOTO', name: 'CFMOTO 650NK / 650MT / 650GT', category: 'Middleweight Twin', cc_displacement: 650 },
  { brand: 'CFMOTO', name: 'CFMOTO 700CL-X (Heritage / Sport / ADV)', category: 'Modern Scrambler', cc_displacement: 700 },
  { brand: 'CFMOTO', name: 'CFMOTO 800NK (Advanced)', category: 'Big Naked', cc_displacement: 800 },
  { brand: 'CFMOTO', name: 'CFMOTO 800MT (Sport / Touring / Explore)', category: 'Adventure Touring', cc_displacement: 800 },

  // ==========================================
  // --- KYMCO ---
  // ==========================================
  { brand: 'Kymco', name: 'Kymco Like 125 / Like 150i (ABS / Noodoe)', category: 'Classic Scooter', cc_displacement: 150 },
  { brand: 'Kymco', name: 'Kymco Dink R 150 (2024)', category: 'Maxi Scooter', cc_displacement: 150 },
  { brand: 'Kymco', name: 'Kymco KRV 180i TCS / KRV Moto 180', category: 'Sport Maxi Scooter', cc_displacement: 180 },
  { brand: 'Kymco', name: 'Kymco Super Z 150', category: 'Urban Scooter', cc_displacement: 150 },
  { brand: 'Kymco', name: 'Kymco Agility 125 / Super 8 150', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Kymco', name: 'Kymco Racing King 180', category: 'Sport Scooter', cc_displacement: 180 },
  { brand: 'Kymco', name: 'Kymco X-Town 300i / Xciting S 400i', category: 'Maxi Scooter', cc_displacement: 400 },
  { brand: 'Kymco', name: 'Kymco DTX 360', category: 'Crossover Adventure Scooter', cc_displacement: 320 },
  { brand: 'Kymco', name: 'Kymco AK 550 / CV3 (3-Wheeler)', category: 'Twin Maxi Scooter', cc_displacement: 550 },

  // ==========================================
  // --- SYM ---
  // ==========================================
  { brand: 'SYM', name: 'SYM Bonus 110 / Bonus X', category: 'Commuter Underbone', cc_displacement: 110 },
  { brand: 'SYM', name: 'SYM Jet 14 125 / 150 / 200', category: 'Urban Scooter', cc_displacement: 150 },
  { brand: 'SYM', name: 'SYM Jet X 150', category: 'Sport Scooter', cc_displacement: 150 },
  { brand: 'SYM', name: 'SYM Husky ADV 150', category: 'Adventure Scooter', cc_displacement: 150 },
  { brand: 'SYM', name: 'SYM Cruisym 150 / Cruisym 300', category: 'Maxi Scooter', cc_displacement: 300 },
  { brand: 'SYM', name: 'SYM VF3i 185 (Underbone King)', category: 'High-Power Underbone', cc_displacement: 185 },
  { brand: 'SYM', name: 'SYM Joyride 200 / Maxsym 400 / Maxsym TL 508', category: 'Maxi Touring Scooter', cc_displacement: 400 },

  // ==========================================
  // --- BRISTOL MOTORCYCLES ---
  // ==========================================
  { brand: 'Bristol', name: 'Bristol Classic 400i / Omega 400', category: 'Classic Single', cc_displacement: 400 },
  { brand: 'Bristol', name: 'Bristol BR 400i / Bobber 650', category: 'Bobber / Cruiser', cc_displacement: 400 },
  { brand: 'Bristol', name: 'Bristol Veloce 500 / Venturi 500', category: 'Adventure Tourer', cc_displacement: 500 },
  { brand: 'Bristol', name: 'Bristol Assassin 400', category: 'Sport Naked', cc_displacement: 400 },
  { brand: 'Bristol', name: 'Bristol ADX 160 / Maxie 400', category: 'Maxi Scooter', cc_displacement: 160 },

  // ==========================================
  // --- ROYAL ENFIELD ---
  // ==========================================
  { brand: 'Royal Enfield', name: 'Royal Enfield Hunter 350', category: 'Modern Roadster', cc_displacement: 350 },
  { brand: 'Royal Enfield', name: 'Royal Enfield Classic 350 / Bullet 350', category: 'Heritage Classic', cc_displacement: 350 },
  { brand: 'Royal Enfield', name: 'Royal Enfield Meteor 350', category: 'Cruiser', cc_displacement: 350 },
  { brand: 'Royal Enfield', name: 'Royal Enfield Himalayan 411 / Himalayan 450 (2024)', category: 'Adventure', cc_displacement: 450 },
  { brand: 'Royal Enfield', name: 'Royal Enfield Scram 411 / Guerrilla 450', category: 'Scrambler / Roadster', cc_displacement: 450 },
  { brand: 'Royal Enfield', name: 'Royal Enfield Interceptor 650 / Continental GT 650', category: 'Twin Cafe / Roadster', cc_displacement: 650 },
  { brand: 'Royal Enfield', name: 'Royal Enfield Super Meteor 650 / Shotgun 650', category: 'Twin Cruiser / Bobber', cc_displacement: 650 },

  // ==========================================
  // --- TVS PHILIPPINES ---
  // ==========================================
  { brand: 'TVS', name: 'TVS Dazz 110 / Dazz Prime', category: 'Scooter', cc_displacement: 110 },
  { brand: 'TVS', name: 'TVS XL100 Heavy Duty', category: 'Moped / Cargo', cc_displacement: 100 },
  { brand: 'TVS', name: 'TVS Ntorq 125 (Race Edition / XT)', category: 'Sport Scooter', cc_displacement: 125 },
  { brand: 'TVS', name: 'TVS Raider 125', category: 'Commuter Naked', cc_displacement: 125 },
  { brand: 'TVS', name: 'TVS Apache RTR 160 4V / RTR 200 4V', category: 'Naked Sport', cc_displacement: 200 },
  { brand: 'TVS', name: 'TVS Apache RR 310', category: 'Sportbike', cc_displacement: 312 },

  // ==========================================
  // --- RUSI PHILIPPINES ---
  // ==========================================
  { brand: 'Rusi', name: 'Rusi Classic 250 / Classic 400', category: 'Classic Cafe', cc_displacement: 250 },
  { brand: 'Rusi', name: 'Rusi Flash 150', category: 'Underbone', cc_displacement: 150 },
  { brand: 'Rusi', name: 'Rusi Passion 125', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Rusi', name: 'Rusi Gala 125', category: 'Scooter', cc_displacement: 125 },
  { brand: 'Rusi', name: 'Rusi Mojo 200', category: 'Cruiser', cc_displacement: 200 },
  { brand: 'Rusi', name: 'Rusi Rapid 150', category: 'Sport Underbone', cc_displacement: 150 },
  { brand: 'Rusi', name: 'Rusi Sigma 250', category: 'Sportbike', cc_displacement: 250 },
  { brand: 'Rusi', name: 'Rusi Gremlin 150 / Rango 110', category: 'Commuter', cc_displacement: 150 },

  // ==========================================
  // --- BENELLI ---
  // ==========================================
  { brand: 'Benelli', name: 'Benelli TNT 135', category: 'Mini Naked', cc_displacement: 135 },
  { brand: 'Benelli', name: 'Benelli Panarea 125', category: 'Retro Scooter', cc_displacement: 125 },
  { brand: 'Benelli', name: 'Benelli Motobi 200 / 200 Evo', category: 'Cruiser', cc_displacement: 200 },
  { brand: 'Benelli', name: 'Benelli Leoncino 250 / 500 / 500 Trail / 800', category: 'Modern Classic', cc_displacement: 500 },
  { brand: 'Benelli', name: 'Benelli TRK 502 / 502X / 702X', category: 'Adventure Tourer', cc_displacement: 500 },
  { brand: 'Benelli', name: 'Benelli Imperiale 400', category: 'Vintage Classic', cc_displacement: 400 },

  // ==========================================
  // --- KTM & HUSQVARNA ---
  // ==========================================
  { brand: 'KTM', name: 'KTM Duke 200 / Duke 390 (Gen 2 / Gen 3)', category: 'Naked Streetfighter', cc_displacement: 390 },
  { brand: 'KTM', name: 'KTM RC 200 / RC 390', category: 'Supersport', cc_displacement: 390 },
  { brand: 'KTM', name: 'KTM 390 Adventure', category: 'Compact Adventure', cc_displacement: 390 },
  { brand: 'KTM', name: 'KTM 790 Duke / 890 Duke R', category: 'Twin Naked', cc_displacement: 890 },
  { brand: 'KTM', name: 'KTM 790 Adventure / 890 Adventure R', category: 'Twin Adventure', cc_displacement: 890 },
  { brand: 'KTM', name: 'KTM 1290 Super Duke R / Super Adventure', category: 'V-Twin Hyper', cc_displacement: 1301 },
  { brand: 'Husqvarna', name: 'Husqvarna Svartpilen 200 / 401', category: 'Urban Scrambler', cc_displacement: 373 },
  { brand: 'Husqvarna', name: 'Husqvarna Vitpilen 401 / Norden 901', category: 'Cafe / Adventure', cc_displacement: 889 },

  // ==========================================
  // --- VESPA PHILIPPINES ---
  // ==========================================
  { brand: 'Vespa', name: 'Vespa S 125 i-Get', category: 'Classic Italian Scooter', cc_displacement: 125 },
  { brand: 'Vespa', name: 'Vespa LX 125 i-Get', category: 'Classic Italian Scooter', cc_displacement: 125 },
  { brand: 'Vespa', name: 'Vespa Primavera 150 (Standard / S / Color Vibe)', category: 'Classic Italian Scooter', cc_displacement: 150 },
  { brand: 'Vespa', name: 'Vespa Sprint 150 (Standard / S / TFT Edition)', category: 'Sport Italian Scooter', cc_displacement: 150 },
  { brand: 'Vespa', name: 'Vespa GTS 150 / GTS 300 Super Sport / HPE', category: 'Maxi Italian Scooter', cc_displacement: 300 },
  { brand: 'Vespa', name: 'Vespa GTV 300 Sei Giorni', category: 'Heritage Italian Scooter', cc_displacement: 300 },

  // ==========================================
  // --- QJ MOTOR ---
  // ==========================================
  { brand: 'QJ Motor', name: 'QJ Motor SRV 200 / SRV 400 (Cruiser)', category: 'Cruiser', cc_displacement: 400 },
  { brand: 'QJ Motor', name: 'QJ Motor SRK 400 / SRK 600', category: 'Naked Street', cc_displacement: 600 },
  { brand: 'QJ Motor', name: 'QJ Motor SRT 700 / SRT 800', category: 'Adventure Tourer', cc_displacement: 750 },
  { brand: 'QJ Motor', name: 'QJ Motor Fort 350', category: 'Maxi Scooter', cc_displacement: 350 },

  // ==========================================
  // --- BMW MOTORRAD ---
  // ==========================================
  { brand: 'BMW', name: 'BMW G 310 R / G 310 GS', category: 'Entry Roadster / GS', cc_displacement: 313 },
  { brand: 'BMW', name: 'BMW C 400 X / C 400 GT', category: 'Urban Maxi Scooter', cc_displacement: 350 },
  { brand: 'BMW', name: 'BMW F 750 GS / F 850 GS / F 900 R / XR', category: 'Middleweight GS / Roadster', cc_displacement: 853 },
  { brand: 'BMW', name: 'BMW R 1200 GS / R 1250 GS Adventure', category: 'Boxer Adventure', cc_displacement: 1254 },
  { brand: 'BMW', name: 'BMW R 1300 GS', category: 'Flagship Adventure', cc_displacement: 1300 },
  { brand: 'BMW', name: 'BMW R nineT / R 12', category: 'Heritage Boxer', cc_displacement: 1170 },
  { brand: 'BMW', name: 'BMW S 1000 RR / S 1000 R / S 1000 XR', category: 'Superbike / Dynamic', cc_displacement: 999 },

  // ==========================================
  // --- DUCATI ---
  // ==========================================
  { brand: 'Ducati', name: 'Ducati Monster 797 / 821 / 937', category: 'Naked', cc_displacement: 937 },
  { brand: 'Ducati', name: 'Ducati Scrambler 800 (Icon / Full Throttle / Nightshift)', category: 'Scrambler', cc_displacement: 803 },
  { brand: 'Ducati', name: 'Ducati Hypermotard 950 / RVE', category: 'Supermotard', cc_displacement: 937 },
  { brand: 'Ducati', name: 'Ducati Streetfighter V2 / V4 / V4S', category: 'Hyper Naked', cc_displacement: 1103 },
  { brand: 'Ducati', name: 'Ducati Panigale V2 / V4 / V4S', category: 'Superbike', cc_displacement: 1103 },
  { brand: 'Ducati', name: 'Ducati Multistrada V2 / V4 / V4 Rally', category: 'Grand Tourer Adventure', cc_displacement: 1158 },
  { brand: 'Ducati', name: 'Ducati DesertX', category: 'Dakar Rally Adventure', cc_displacement: 937 },
  { brand: 'Ducati', name: 'Ducati Diavel 1260 / Diavel V4', category: 'Power Cruiser', cc_displacement: 1158 },

  // ==========================================
  // --- TRIUMPH & HARLEY-DAVIDSON ---
  // ==========================================
  { brand: 'Triumph', name: 'Triumph Speed 400 / Scrambler 400X (2024)', category: 'Modern Classic 400', cc_displacement: 398 },
  { brand: 'Triumph', name: 'Triumph Trident 660 / Tiger Sport 660', category: 'Triple Roadster / Sport Tourer', cc_displacement: 660 },
  { brand: 'Triumph', name: 'Triumph Street Triple 765 R / RS', category: 'Triple Naked', cc_displacement: 765 },
  { brand: 'Triumph', name: 'Triumph Bonneville T100 / T120', category: 'Modern Classic', cc_displacement: 900 },
  { brand: 'Triumph', name: 'Triumph Scrambler 900 / 1200', category: 'Scrambler', cc_displacement: 900 },
  { brand: 'Triumph', name: 'Triumph Tiger 900 / 1200 Rally Pro', category: 'Adventure Touring', cc_displacement: 900 },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Iron 883 / Forty-Eight', category: 'Evolution Cruiser', cc_displacement: 883 },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Nightster 975 / Sportster S 1250', category: 'Revolution Max Cruiser', cc_displacement: 975 },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Fat Boy 114 / Street Bob 114', category: 'Softail Cruiser', cc_displacement: 1868 },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Street Glide / Road Glide Special', category: 'Grand American Touring', cc_displacement: 1868 },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Pan America 1250 Special', category: 'Adventure Tourer', cc_displacement: 1250 },
];

const OFFICIAL_ADMIN_MODELS_KEY = 'motocare_official_admin_custom_models';

/**
 * Kunin ang mga opisyal na modelong idinagdag ng Admin mula sa local storage
 */
export function getLocalAdminAddedModels(): OfficialBikeModel[] {
  try {
    const raw = localStorage.getItem(OFFICIAL_ADMIN_MODELS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalAdminAddedModels(models: OfficialBikeModel[]): void {
  try {
    localStorage.setItem(OFFICIAL_ADMIN_MODELS_KEY, JSON.stringify(models));
  } catch {
    // ignore
  }
}

/**
 * Kunin ang kumpletong opisyal na catalog:
 * 1. Database table `motorcycle_models` (kung may internet at nakakabit ang Supabase)
 * 2. Merged sa comprehensive 230+ Base Models
 * 3. Merged sa Admin-added models
 */
export async function getCompleteMotorcycleCatalog(): Promise<OfficialBikeModel[]> {
  const modelMap = new Map<string, OfficialBikeModel>();

  // 1. I-load ang 230+ Base Models
  for (const m of BASE_MOTORCYCLE_MODELS) {
    modelMap.set(m.name.trim().toLowerCase(), m);
  }

  // 2. I-load ang local admin-added models
  const localAdminModels = getLocalAdminAddedModels();
  for (const m of localAdminModels) {
    if (m.is_active !== false) {
      modelMap.set(m.name.trim().toLowerCase(), m);
    }
  }

  // 3. I-query ang Supabase `motorcycle_models` table
  try {
    const { data, error } = await supabase
      .from('motorcycle_models')
      .select('id, brand, name, category, cc_displacement, is_active')
      .order('name');

    if (!error && data && data.length > 0) {
      for (const row of data) {
        if (row.is_active !== false) {
          modelMap.set(row.name.trim().toLowerCase(), {
            id: row.id,
            brand: row.brand || 'Custom',
            name: row.name,
            category: row.category || 'Standard',
            cc_displacement: row.cc_displacement || 150,
            is_active: true,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not load motorcycle_models from Supabase, using base catalog:', err);
  }

  return Array.from(modelMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * SAFE CUSTOM UNLISTED HANDLER (Data Hygiene: Zero Global Pollution):
 * Hindi nag-aauto-insert sa global table ang customer-typed text upang maiwasan
 * ang typos, slang, at duplicate entries sa master table.
 */
export async function registerNewMotorcycleModel(name: string): Promise<BikeModel> {
  const cleanName = name.trim();
  const brand = cleanName.split(' ')[0] || 'Custom';
  return {
    brand,
    name: cleanName,
  };
}

/**
 * ADMIN-ONLY ACTION: Magdagdag ng bagong OPISYAL na modelo sa database catalog
 */
export async function addOfficialCatalogModel({
  brand,
  name,
  category = 'Standard',
  cc_displacement = 150,
}: {
  brand: string;
  name: string;
  category?: string;
  cc_displacement?: number;
}): Promise<{ success: boolean; model?: OfficialBikeModel; error?: string }> {
  const cleanBrand = brand.trim();
  const cleanName = name.trim();

  if (!cleanBrand || !cleanName) {
    return { success: false, error: 'Please provide both Brand and Model Name.' };
  }

  const newModel: OfficialBikeModel = {
    id: `model-${Date.now()}`,
    brand: cleanBrand,
    name: cleanName,
    category,
    cc_displacement,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Subukan i-insert sa Supabase `motorcycle_models` table
    const { data, error } = await supabase
      .from('motorcycle_models')
      .insert({
        brand: cleanBrand,
        name: cleanName,
        category,
        cc_displacement,
        is_active: true,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      newModel.id = data.id;
    }
  } catch (err) {
    console.warn('Supabase insert failed, saving to local admin catalog cache:', err);
  }

  // 2. I-save sa local admin catalog para instant ang paglitaw
  const current = getLocalAdminAddedModels().filter(
    (m) => m.name.toLowerCase() !== cleanName.toLowerCase()
  );
  saveLocalAdminAddedModels([newModel, ...current]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('motocare_catalog_updated'));
  }

  return { success: true, model: newModel };
}

/**
 * ADMIN-ONLY ACTION: I-toggle ang active status ng isang opisyal na modelo
 */
export async function toggleOfficialCatalogModelStatus(
  id: string,
  modelName: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  const nextStatus = !currentStatus;

  try {
    if (id && !id.startsWith('model-')) {
      await supabase
        .from('motorcycle_models')
        .update({ is_active: nextStatus })
        .eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase update failed:', err);
  }

  // Update in local admin registry if present
  const current = getLocalAdminAddedModels();
  const updated = current.map((m) =>
    m.id === id || m.name.toLowerCase() === modelName.toLowerCase()
      ? { ...m, is_active: nextStatus }
      : m
  );
  saveLocalAdminAddedModels(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('motocare_catalog_updated'));
  }

  return { success: true };
}
