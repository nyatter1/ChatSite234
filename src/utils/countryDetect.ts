// Country and Language auto-detection utility

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // UK & Ireland
  'Europe/London': 'United Kingdom',
  'Europe/Belfast': 'United Kingdom',
  'Europe/Dublin': 'Ireland',

  // North America
  'America/New_York': 'United States',
  'America/Detroit': 'United States',
  'America/Kentucky/Louisville': 'United States',
  'America/Chicago': 'United States',
  'America/Indiana/Indianapolis': 'United States',
  'America/Denver': 'United States',
  'America/Phoenix': 'United States',
  'America/Los_Angeles': 'United States',
  'America/Anchorage': 'United States',
  'America/Honolulu': 'United States',
  'America/Toronto': 'Canada',
  'America/Vancouver': 'Canada',
  'America/Montreal': 'Canada',
  'America/Edmonton': 'Canada',
  'America/Winnipeg': 'Canada',
  'America/Halifax': 'Canada',
  'America/Mexico_City': 'Mexico',
  'America/Cancun': 'Mexico',
  'America/Monterrey': 'Mexico',

  // Western & Central Europe
  'Europe/Paris': 'France',
  'Europe/Berlin': 'Germany',
  'Europe/Rome': 'Italy',
  'Europe/Madrid': 'Spain',
  'Europe/Amsterdam': 'Netherlands',
  'Europe/Brussels': 'Belgium',
  'Europe/Vienna': 'Austria',
  'Europe/Zurich': 'Switzerland',
  'Europe/Luxembourg': 'Luxembourg',
  'Europe/Monaco': 'Monaco',

  // Northern Europe
  'Europe/Stockholm': 'Sweden',
  'Europe/Oslo': 'Norway',
  'Europe/Copenhagen': 'Denmark',
  'Europe/Helsinki': 'Finland',
  'Europe/Reykjavik': 'Iceland',

  // Eastern & Southern Europe
  'Europe/Warsaw': 'Poland',
  'Europe/Prague': 'Czech Republic',
  'Europe/Budapest': 'Hungary',
  'Europe/Bucharest': 'Romania',
  'Europe/Athens': 'Greece',
  'Europe/Lisbon': 'Portugal',
  'Europe/Belgrade': 'Serbia',
  'Europe/Zagreb': 'Croatia',
  'Europe/Sofia': 'Bulgaria',
  'Europe/Bratislava': 'Slovakia',
  'Europe/Kiev': 'Ukraine',
  'Europe/Kyiv': 'Ukraine',
  'Europe/Tallinn': 'Estonia',
  'Europe/Riga': 'Latvia',
  'Europe/Vilnius': 'Lithuania',
  'Europe/Istanbul': 'Turkey',

  // Asia & Middle East
  'Asia/Tokyo': 'Japan',
  'Asia/Seoul': 'South Korea',
  'Asia/Shanghai': 'China',
  'Asia/Chongqing': 'China',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Taipei': 'Taiwan',
  'Asia/Singapore': 'Singapore',
  'Asia/Kolkata': 'India',
  'Asia/Calcutta': 'India',
  'Asia/Jakarta': 'Indonesia',
  'Asia/Bangkok': 'Thailand',
  'Asia/Manila': 'Philippines',
  'Asia/Kuala_Lumpur': 'Malaysia',
  'Asia/Ho_Chi_Minh': 'Vietnam',
  'Asia/Dubai': 'United Arab Emirates',
  'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Qatar': 'Qatar',
  'Asia/Kuwait': 'Kuwait',
  'Asia/Tel_Aviv': 'Israel',
  'Asia/Jerusalem': 'Israel',

  // Oceania
  'Australia/Sydney': 'Australia',
  'Australia/Melbourne': 'Australia',
  'Australia/Brisbane': 'Australia',
  'Australia/Perth': 'Australia',
  'Australia/Adelaide': 'Australia',
  'Australia/Hobart': 'Australia',
  'Pacific/Auckland': 'New Zealand',
  'Pacific/Fiji': 'Fiji',

  // South America
  'America/Sao_Paulo': 'Brazil',
  'America/Rio_Branco': 'Brazil',
  'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Santiago': 'Chile',
  'America/Bogota': 'Colombia',
  'America/Lima': 'Peru',

  // Africa
  'Africa/Johannesburg': 'South Africa',
  'Africa/Cairo': 'Egypt',
  'Africa/Lagos': 'Nigeria',
  'Africa/Nairobi': 'Kenya',
  'Africa/Casablanca': 'Morocco'
};

export function getInstantUserCountry(): { country: string; language: string } {
  let country = 'United Kingdom';
  let language = 'English';

  try {
    // 1. Check browser timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_COUNTRY[tz]) {
      country = TIMEZONE_TO_COUNTRY[tz];
    } else if (tz) {
      // General match by timezone prefix
      if (tz.startsWith('Europe/')) {
        const city = tz.replace('Europe/', '');
        country = city.replace(/_/g, ' ');
      } else if (tz.startsWith('America/')) {
        country = 'United States';
      } else if (tz.startsWith('Australia/')) {
        country = 'Australia';
      } else if (tz.startsWith('Asia/')) {
        country = 'Asia';
      }
    }

    // 2. Fallback to navigator.language region
    const navLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    if (navLang.includes('-')) {
      const regionCode = navLang.split('-')[1]?.toUpperCase();
      if (regionCode) {
        try {
          const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
          const regName = regionNames.of(regionCode);
          if (regName && (!tz || !TIMEZONE_TO_COUNTRY[tz])) {
            country = regName;
          }
        } catch (_) {}
      }
    }

    // 3. Detect language name
    if (navLang) {
      const langCode = navLang.split('-')[0];
      try {
        const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
        const lName = langNames.of(langCode);
        if (lName) {
          language = lName;
        }
      } catch (_) {}
    }
  } catch (_) {}

  return { country, language };
}

export async function detectUserCountry(): Promise<{ country: string; language: string }> {
  // Start with instant detection
  const instant = getInstantUserCountry();
  let country = instant.country;
  const language = instant.language;

  // Try fast network lookup for high precision
  try {
    const res = await fetch('https://api.country.is/', {
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.country) {
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const name = regionNames.of(data.country);
        if (name) {
          return { country: name, language };
        }
      }
    }
  } catch (_) {
    // Fallback to ipapi if first fails
    try {
      const res2 = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(2500)
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2.country_name) {
          return { country: data2.country_name, language };
        }
      }
    } catch (_) {}
  }

  return { country, language };
}
