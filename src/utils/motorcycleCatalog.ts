import { BikeModel } from '../types/dashboard';
import { supabase } from '../lib/supabase';
import { motorcyclesApi } from '../lib/api';

/**
 * 185 Philippine Motorcycle Models Base Catalog
 * Garantisadong laging available kahit offline ang server o hindi pa na-run ang SQL migration sa Supabase.
 */
export const BASE_MOTORCYCLE_MODELS: BikeModel[] = [
  // --- HONDA ---
  { brand: 'Honda', name: 'Honda Click 125 (V1 / V2 / V3)' },
  { brand: 'Honda', name: 'Honda Click 150 / 160' },
  { brand: 'Honda', name: 'Honda Beat 110 (Carb / Fi)' },
  { brand: 'Honda', name: 'Honda PCX 150 / 160' },
  { brand: 'Honda', name: 'Honda ADV 150 / 160' },
  { brand: 'Honda', name: 'Honda Genio 110 / Scoopy' },
  { brand: 'Honda', name: 'Honda Zoomer-X 110' },
  { brand: 'Honda', name: 'Honda Wave 100 / 110 Alpha / 125' },
  { brand: 'Honda', name: 'Honda XRM 110 / 125 (Carb / Fi / Motard)' },
  { brand: 'Honda', name: 'Honda RS125 Fi' },
  { brand: 'Honda', name: 'Honda Winner X 150 / Supra GTR' },
  { brand: 'Honda', name: 'Honda TMX 125 Alpha' },
  { brand: 'Honda', name: 'Honda TMX 155 (Classic CDI / Contact Point)' },
  { brand: 'Honda', name: 'Honda Super Cub C125 / CT125 Hunter Cub' },
  { brand: 'Honda', name: 'Honda Dream 100 / C70 (Vintage)' },
  { brand: 'Honda', name: 'Honda XR150L / XR200' },
  { brand: 'Honda', name: 'Honda CRF150L / CRF250L / CRF300L / Rally' },
  { brand: 'Honda', name: 'Honda CBR150R / CB150R / CB150X' },
  { brand: 'Honda', name: 'Honda CB400 Super Four (Project Big 1)' },
  { brand: 'Honda', name: 'Honda CB500X / NX500 / CBR500R' },
  { brand: 'Honda', name: 'Honda Rebel 500 / Rebel 1100' },
  { brand: 'Honda', name: 'Honda CB650R / CBR650R' },
  { brand: 'Honda', name: 'Honda Transalp XL750' },
  { brand: 'Honda', name: 'Honda X-ADV 750 / Forza 350 / 750' },
  { brand: 'Honda', name: 'Honda Africa Twin CRF1100L' },
  { brand: 'Honda', name: 'Honda CBR1000RR Fireblade' },
  { brand: 'Honda', name: 'Honda Gold Wing 1800' },

  // --- YAMAHA ---
  { brand: 'Yamaha', name: 'Yamaha NMAX 155 (V1 / V2 / V3)' },
  { brand: 'Yamaha', name: 'Yamaha Aerox 155 (V1 / V2)' },
  { brand: 'Yamaha', name: 'Yamaha Mio Sporty / Amore' },
  { brand: 'Yamaha', name: 'Yamaha Mio i 125 (M3)' },
  { brand: 'Yamaha', name: 'Yamaha Mio Soul / Soul i 115 / 125' },
  { brand: 'Yamaha', name: 'Yamaha Mio Gravis 125' },
  { brand: 'Yamaha', name: 'Yamaha Mio Fazzio 125' },
  { brand: 'Yamaha', name: 'Yamaha Mio Gear 125' },
  { brand: 'Yamaha', name: 'Yamaha Sniper 135 (Classic)' },
  { brand: 'Yamaha', name: 'Yamaha Sniper 150 (MXi / King)' },
  { brand: 'Yamaha', name: 'Yamaha Sniper 155 / 155R' },
  { brand: 'Yamaha', name: 'Yamaha Sight 115 / Vega Force Fi' },
  { brand: 'Yamaha', name: 'Yamaha Crypton 100 / 110 (Classic)' },
  { brand: 'Yamaha', name: 'Yamaha YTX 125' },
  { brand: 'Yamaha', name: 'Yamaha RS100 / RX100 / RX-T 135 (2-Stroke)' },
  { brand: 'Yamaha', name: 'Yamaha DT125 Enduro (Classic)' },
  { brand: 'Yamaha', name: 'Yamaha WR 155R / Serow 250' },
  { brand: 'Yamaha', name: 'Yamaha XSR 155 / MT-15 / TFX 150' },
  { brand: 'Yamaha', name: 'Yamaha YZF-R15 (V1 / V2 / V3 / V4)' },
  { brand: 'Yamaha', name: 'Yamaha YZF-R3 / MT-03' },
  { brand: 'Yamaha', name: 'Yamaha XMAX 300 / TMAX 560' },
  { brand: 'Yamaha', name: 'Yamaha MT-07 / YZF-R7 / Tenere 700' },
  { brand: 'Yamaha', name: 'Yamaha MT-09 / Tracer 9 GT / XSR 900' },
  { brand: 'Yamaha', name: 'Yamaha YZF-R1 / R1M / MT-10' },

  // --- SUZUKI ---
  { brand: 'Suzuki', name: 'Suzuki Raider R150 Carburetor' },
  { brand: 'Suzuki', name: 'Suzuki Raider R150 Fi' },
  { brand: 'Suzuki', name: 'Suzuki Raider J 110 / 115 Fi / Crossover' },
  { brand: 'Suzuki', name: 'Suzuki Smash 110 (Classic) / Smash 115' },
  { brand: 'Suzuki', name: 'Suzuki Shogun 125 / Shogun Pro' },
  { brand: 'Suzuki', name: 'Suzuki Burgman Street 125 / Street EX' },
  { brand: 'Suzuki', name: 'Suzuki Avenis 125' },
  { brand: 'Suzuki', name: 'Suzuki Skydrive 125 / Skydrive Sport / Crossover' },
  { brand: 'Suzuki', name: 'Suzuki Step 125 / Address 110' },
  { brand: 'Suzuki', name: 'Suzuki GD110 / Thunder 125' },
  { brand: 'Suzuki', name: 'Suzuki Gixxer 150 / Gixxer 250 / SF 250' },
  { brand: 'Suzuki', name: 'Suzuki GSX-R150 / GSX-S150' },
  { brand: 'Suzuki', name: 'Suzuki V-Strom 250SX / V-Strom 650 XT' },
  { brand: 'Suzuki', name: 'Suzuki SV650 / SV650X' },
  { brand: 'Suzuki', name: 'Suzuki GSX-8S / GSX-8R / V-Strom 800DE' },
  { brand: 'Suzuki', name: 'Suzuki GSX-S750 / GSX-R750' },
  { brand: 'Suzuki', name: 'Suzuki GSX-R1000 / GSX-S1000 / Katana' },
  { brand: 'Suzuki', name: 'Suzuki Hayabusa (GSX-1300R)' },

  // --- KAWASAKI ---
  { brand: 'Kawasaki', name: 'Kawasaki Barako I / II 175' },
  { brand: 'Kawasaki', name: 'Kawasaki CT100 / CT125 / CT150' },
  { brand: 'Kawasaki', name: 'Kawasaki HD3 / GTO 125 (Classic 2-Stroke)' },
  { brand: 'Kawasaki', name: 'Kawasaki Fury 125 / 125R / Curve 115' },
  { brand: 'Kawasaki', name: 'Kawasaki KLX 140 / 150 / 230 / 300' },
  { brand: 'Kawasaki', name: 'Kawasaki D-Tracker 150 / 250' },
  { brand: 'Kawasaki', name: 'Kawasaki Rouser NS125 / NS160 / NS200' },
  { brand: 'Kawasaki', name: 'Kawasaki Rouser 135LS / 180 / 220' },
  { brand: 'Kawasaki', name: 'Kawasaki Dominar 400 (V1 / UG)' },
  { brand: 'Kawasaki', name: 'Kawasaki Ninja 300 / 400 / 500' },
  { brand: 'Kawasaki', name: 'Kawasaki Ninja ZX-4RR / ZX-6R' },
  { brand: 'Kawasaki', name: 'Kawasaki Z400 / Z500 / Z650 / Ninja 650' },
  { brand: 'Kawasaki', name: 'Kawasaki Vulcan S 650 / W800' },
  { brand: 'Kawasaki', name: 'Kawasaki Versys-X 300 / Versys 650 / 1000' },
  { brand: 'Kawasaki', name: 'Kawasaki Z900 / Z900RS / Z1000' },
  { brand: 'Kawasaki', name: 'Kawasaki Ninja ZX-10R / Ninja H2' },

  // --- RUSI ---
  { brand: 'Rusi', name: 'Rusi Classic 250 (RC250)' },
  { brand: 'Rusi', name: 'Rusi Classic 400' },
  { brand: 'Rusi', name: 'Rusi Mojo 200 (Scrambler)' },
  { brand: 'Rusi', name: 'Rusi Titan 250' },
  { brand: 'Rusi', name: 'Rusi Ripcord 250' },
  { brand: 'Rusi', name: 'Rusi Flash 150 (Scooter)' },
  { brand: 'Rusi', name: 'Rusi Rapid 150' },
  { brand: 'Rusi', name: 'Rusi Gala 125' },
  { brand: 'Rusi', name: 'Rusi Passion 125' },
  { brand: 'Rusi', name: 'Rusi Sigma 250' },
  { brand: 'Rusi', name: 'Rusi RFI 175' },
  { brand: 'Rusi', name: 'Rusi TC 125 / TC 150 (Tricycle Backbone)' },
  { brand: 'Rusi', name: 'Rusi Korak Plus 110' },
  { brand: 'Rusi', name: 'Rusi Macho 125 / 150' },
  { brand: 'Rusi', name: 'Rusi Gremlin 110 / SSX 200' },

  // --- MOTORSTAR & SKYGO ---
  { brand: 'Motorstar', name: 'Motorstar Cafe 400' },
  { brand: 'Motorstar', name: 'Motorstar Star-X 125 / 155' },
  { brand: 'Motorstar', name: 'Motorstar Z-One 150 / Hawk 150' },
  { brand: 'Motorstar', name: 'Motorstar MSX 125 / Easycamper 150' },
  { brand: 'Skygo', name: 'Skygo Boss 150 / King 150' },
  { brand: 'Skygo', name: 'Skygo Earl 150 / Pony 100 / Archer 125' },

  // --- KYMCO & SYM ---
  { brand: 'Kymco', name: 'Kymco Like 125 / 150i (Noodoe)' },
  { brand: 'Kymco', name: 'Kymco KRV 180i TCS' },
  { brand: 'Kymco', name: 'Kymco Super 8 125 / 150' },
  { brand: 'Kymco', name: 'Kymco Dink R 150 / Racing King 180' },
  { brand: 'Kymco', name: 'Kymco X-Town 300Fi / Downtown 350' },
  { brand: 'Kymco', name: 'Kymco Xciting S 400 / AK550' },
  { brand: 'SYM', name: 'SYM Bonus 110 / Bonus X' },
  { brand: 'SYM', name: 'SYM Jet 14 150 / 200' },
  { brand: 'SYM', name: 'SYM Cruisym 150 / 300' },
  { brand: 'SYM', name: 'SYM Husky ADV 150' },
  { brand: 'SYM', name: 'SYM Maxsym 400 / Maxsym TL 508' },

  // --- VESPA ---
  { brand: 'Vespa', name: 'Vespa Sprint 150 / Carbon' },
  { brand: 'Vespa', name: 'Vespa Primavera 150' },
  { brand: 'Vespa', name: 'Vespa GTS 300 Super Sport / HPE' },
  { brand: 'Vespa', name: 'Vespa S 125 / LX 125 / GTV 300' },

  // --- BAJAJ & TVS ---
  { brand: 'Bajaj', name: 'Bajaj CT100 / CT125 / CT150 Boxer' },
  { brand: 'Bajaj', name: 'Bajaj Pulsar NS160 / NS200' },
  { brand: 'Bajaj', name: 'Bajaj RE 3-Wheeler / Maxima Z' },
  { brand: 'TVS', name: 'TVS Ntorq 125' },
  { brand: 'TVS', name: 'TVS Dazz 110 / Neo XR 110' },
  { brand: 'TVS', name: 'TVS Apache RTR 160 / 200 4V / RR310' },
  { brand: 'TVS', name: 'TVS Ronin 225' },

  // --- CFMOTO ---
  { brand: 'CFMOTO', name: 'CFMOTO Papio XO-1 / XO-2' },
  { brand: 'CFMOTO', name: 'CFMOTO 300SR / 300NK' },
  { brand: 'CFMOTO', name: 'CFMOTO 450SR / 450SR-S' },
  { brand: 'CFMOTO', name: 'CFMOTO 450NK / 450CL-C' },
  { brand: 'CFMOTO', name: 'CFMOTO 450MT (Adventure)' },
  { brand: 'CFMOTO', name: 'CFMOTO 650NK / 650MT / 650GT' },
  { brand: 'CFMOTO', name: 'CFMOTO 700CL-X (Heritage / Sport / ADV)' },
  { brand: 'CFMOTO', name: 'CFMOTO 800MT (Sport / Touring / Explore)' },
  { brand: 'CFMOTO', name: 'CFMOTO 800NK' },

  // --- BRISTOL, BENELLI & QJ MOTOR ---
  { brand: 'Bristol', name: 'Bristol Classic 400 / Omega 400' },
  { brand: 'Bristol', name: 'Bristol BR 400i / Bobber 650' },
  { brand: 'Bristol', name: 'Bristol Veloce 500 / Venturi 500' },
  { brand: 'Bristol', name: 'Bristol Assassin 400 / ADX 160' },
  { brand: 'Benelli', name: 'Benelli Leoncino 250 / 500 / Trail' },
  { brand: 'Benelli', name: 'Benelli TRK 502 / 502X / 502C Cruiser' },
  { brand: 'Benelli', name: 'Benelli TNT 135 / Imperiale 400' },
  { brand: 'QJ Motor', name: 'QJ Motor SRV 200 / SRV 400' },
  { brand: 'QJ Motor', name: 'QJ Motor SRK 400 / SRK 600 / SRT 800' },

  // --- KTM & HUSQVARNA ---
  { brand: 'KTM', name: 'KTM Duke 200 / Duke 390' },
  { brand: 'KTM', name: 'KTM RC 200 / RC 390' },
  { brand: 'KTM', name: 'KTM 390 Adventure' },
  { brand: 'KTM', name: 'KTM 790 Duke / 890 Duke R' },
  { brand: 'KTM', name: 'KTM 790 Adventure / 890 Adventure R' },
  { brand: 'KTM', name: 'KTM 1290 Super Duke R / Super Adventure' },
  { brand: 'Husqvarna', name: 'Husqvarna Svartpilen 200 / 401' },
  { brand: 'Husqvarna', name: 'Husqvarna Vitpilen 401 / Norden 901' },

  // --- ROYAL ENFIELD ---
  { brand: 'Royal Enfield', name: 'Royal Enfield Classic 350 / Bullet 350' },
  { brand: 'Royal Enfield', name: 'Royal Enfield Hunter 350 / Meteor 350' },
  { brand: 'Royal Enfield', name: 'Royal Enfield Himalayan 411 / Himalayan 450' },
  { brand: 'Royal Enfield', name: 'Royal Enfield Scram 411' },
  { brand: 'Royal Enfield', name: 'Royal Enfield Interceptor 650 / Continental GT 650' },
  { brand: 'Royal Enfield', name: 'Royal Enfield Super Meteor 650 / Shotgun 650' },

  // --- BMW MOTORRAD ---
  { brand: 'BMW', name: 'BMW G 310 R / G 310 GS' },
  { brand: 'BMW', name: 'BMW C 400 X / GT' },
  { brand: 'BMW', name: 'BMW F 750 GS / F 850 GS / F 900 R / XR' },
  { brand: 'BMW', name: 'BMW R 1200 GS / R 1250 GS Adventure' },
  { brand: 'BMW', name: 'BMW R 1300 GS' },
  { brand: 'BMW', name: 'BMW R nineT / R 12' },
  { brand: 'BMW', name: 'BMW S 1000 RR / S 1000 R / S 1000 XR' },

  // --- DUCATI ---
  { brand: 'Ducati', name: 'Ducati Monster 797 / 821 / 937' },
  { brand: 'Ducati', name: 'Ducati Scrambler 800 (Icon / Full Throttle)' },
  { brand: 'Ducati', name: 'Ducati Hypermotard 950' },
  { brand: 'Ducati', name: 'Ducati Streetfighter V2 / V4' },
  { brand: 'Ducati', name: 'Ducati Panigale V2 / V4 / V4S' },
  { brand: 'Ducati', name: 'Ducati Multistrada 950 / V2 / V4' },
  { brand: 'Ducati', name: 'Ducati Diavel 1260 / Diavel V4' },

  // --- TRIUMPH & HARLEY-DAVIDSON ---
  { brand: 'Triumph', name: 'Triumph Trident 660 / Tiger Sport 660' },
  { brand: 'Triumph', name: 'Triumph Street Triple 765 R / RS' },
  { brand: 'Triumph', name: 'Triumph Bonneville T100 / T120' },
  { brand: 'Triumph', name: 'Triumph Scrambler 900 / 1200' },
  { brand: 'Triumph', name: 'Triumph Tiger 900 / 1200' },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Iron 883 / Forty-Eight' },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Street 750 / Street Rod' },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Sportster S 1250 / Nightster' },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Fat Boy 114 / Street Bob' },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Street Glide / Road Glide' },
  { brand: 'Harley-Davidson', name: 'Harley-Davidson Pan America 1250' },
];

const STORAGE_KEY = 'motocare_custom_motorcycle_models';

/**
 * Kunin ang buong listahan ng mga modelo:
 * Base 185 models + mga bagong na-type/na-save ng user
 */
export function getStoredCustomModels(): BikeModel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Magdagdag ng bagong modelo sa catalog at i-save sa local storage at database
 */
export async function registerNewMotorcycleModel(name: string): Promise<BikeModel> {
  const cleanName = name.trim();
  const brand = cleanName.split(' ')[0] || 'Custom';

  const newModel: BikeModel = {
    brand,
    name: cleanName,
  };

  try {
    // 1. I-save sa localStorage para sa immediate client persistence
    const current = getStoredCustomModels();
    const exists = current.some((m) => m.name.toLowerCase() === cleanName.toLowerCase());
    if (!exists) {
      current.push(newModel);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }

    // 2. Subukan i-save sa Supabase table kung may table na
    await supabase.from('motorcycle_models').insert({
      brand,
      name: cleanName,
      is_active: true,
    });
  } catch (err) {
    console.warn('Could not sync new model to Supabase table:', err);
  }

  return newModel;
}

/**
 * Kunin ang pinagsama-samang catalog (Base + Custom Saved)
 */
export async function getCompleteMotorcycleCatalog(): Promise<BikeModel[]> {
  const combinedMap = new Map<string, BikeModel>();

  // 1. Ilagay ang 185 base models
  for (const model of BASE_MOTORCYCLE_MODELS) {
    combinedMap.set(model.name.toLowerCase(), model);
  }

  // 2. Ilagay ang local custom models na na-save dati
  const customModels = getStoredCustomModels();
  for (const model of customModels) {
    combinedMap.set(model.name.toLowerCase(), model);
  }

  // 3. Subukan kunin mula sa backend / database
  try {
    const res = await motorcyclesApi.getCatalog();
    if (res.success && res.data && res.data.length > 0) {
      for (const model of res.data) {
        combinedMap.set(model.name.toLowerCase(), model);
      }
    }
  } catch {
    // Ignore kung offline ang server
  }

  return Array.from(combinedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
