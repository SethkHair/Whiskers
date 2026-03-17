/**
 * Scrapes whisky data from Wikidata and inserts into Supabase.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=your_service_role_key node scripts/scrape-whiskies.mjs
 *
 * Find your service role key in:
 *   Supabase dashboard → Project Settings → API → service_role (secret)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ohqaiilwnozhmkeajpjx.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Map Wikidata country labels → our country enum values
const COUNTRY_MAP = {
  'United Kingdom': 'Scotland',
  'Scotland': 'Scotland',
  'United States': 'USA',
  'United States of America': 'USA',
  'Ireland': 'Ireland',
  'Japan': 'Japan',
  'Canada': 'Canada',
  'India': 'India',
  'Taiwan': 'Taiwan',
  'Australia': 'Australia',
};

const KNOWN_COUNTRIES = ['Scotland', 'USA', 'Ireland', 'Japan', 'Canada', 'India', 'Taiwan', 'Australia'];

// Map Wikidata type labels → our WhiskyType enum
const TYPE_MAP = {
  'single malt Scotch whisky': 'single_malt',
  'single malt whisky': 'single_malt',
  'blended Scotch whisky': 'blended',
  'blended whisky': 'blended',
  'blended malt Scotch whisky': 'blended',
  'bourbon whiskey': 'bourbon',
  'bourbon': 'bourbon',
  'rye whiskey': 'rye',
  'Irish whiskey': 'irish',
  'Japanese whisky': 'japanese',
  'Japanese whiskey': 'japanese',
};

function mapType(typeLabel) {
  if (!typeLabel) return 'other';
  const lower = typeLabel.toLowerCase();
  for (const [key, val] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  if (lower.includes('bourbon')) return 'bourbon';
  if (lower.includes('rye')) return 'rye';
  if (lower.includes('irish')) return 'irish';
  if (lower.includes('japan')) return 'japanese';
  if (lower.includes('single malt')) return 'single_malt';
  if (lower.includes('blend')) return 'blended';
  return 'other';
}

function mapCountry(countryLabel) {
  if (!countryLabel) return null;
  return COUNTRY_MAP[countryLabel] ?? (KNOWN_COUNTRIES.includes(countryLabel) ? countryLabel : 'Other');
}

// Whisky type QIDs on Wikidata (verified)
const WHISKY_TYPES_WIKIDATA = [
  { qid: 'Q10668296', type: 'single_malt' },  // single malt Scotch
  { qid: 'Q1940734',  type: 'single_malt' },  // single malt whisky (general)
  { qid: 'Q382947',   type: 'blended' },      // Scotch whisky (inc. blended)
  { qid: 'Q543127',   type: 'bourbon' },      // bourbon whiskey
  { qid: 'Q2535077',  type: 'rye' },          // rye whiskey
  { qid: 'Q909747',   type: 'irish' },        // Irish whiskey
  { qid: 'Q901367',   type: 'japanese' },     // Japanese whisky
  { qid: 'Q281',      type: 'other' },        // whisky (generic catch-all)
];

function buildQuery(qid) {
  return `
SELECT DISTINCT ?item ?name ?distilleryLabel ?countryLabel ?regionLabel ?abv ?description WHERE {
  ?item wdt:P31 wd:${qid} .
  ?item rdfs:label ?name . FILTER(LANG(?name) = "en")
  OPTIONAL {
    ?item wdt:P176 ?distillery .
    ?distillery rdfs:label ?distilleryLabel . FILTER(LANG(?distilleryLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P495 ?country .
    ?country rdfs:label ?countryLabel . FILTER(LANG(?countryLabel) = "en")
  }
  OPTIONAL {
    ?item wdt:P131 ?region .
    ?region rdfs:label ?regionLabel . FILTER(LANG(?regionLabel) = "en")
  }
  OPTIONAL { ?item wdt:P2565 ?abv . }
  OPTIONAL {
    ?item schema:description ?description . FILTER(LANG(?description) = "en")
  }
}
LIMIT 500
`;
}

async function fetchFromWikidata() {
  const allRows = [];

  for (const { qid, type } of WHISKY_TYPES_WIKIDATA) {
    process.stdout.write(`  Fetching ${type} (${qid})...`);
    try {
      const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({
        query: buildQuery(qid),
        format: 'json',
      });

      const res = await fetch(url, {
        headers: { 'User-Agent': 'WhiskersApp/1.0 (whisky database seeding)' },
      });

      if (!res.ok) {
        console.log(` skipped (${res.status})`);
        continue;
      }

      const json = await res.json();
      const rows = json.results.bindings.map(r => ({ ...r, _type: type }));
      allRows.push(...rows);
      console.log(` ${rows.length} results`);

      // Be polite to Wikidata
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(` error: ${e.message}`);
    }
  }

  return allRows;
}

function parseRows(rows) {
  const seen = new Set();
  const whiskies = [];

  for (const row of rows) {
    const name = row.name?.value?.trim();
    const distillery = row.distilleryLabel?.value?.trim();
    const countryLabel = row.countryLabel?.value;
    const regionLabel = row.regionLabel?.value;
    const abvRaw = row.abv?.value;
    const description = row.description?.value?.trim() ?? null;

    // Skip if no name or distillery
    if (!name || !distillery) continue;

    // Skip Wikidata meta-labels
    if (name.startsWith('Q') && /^Q\d+$/.test(name)) continue;

    const key = `${name}__${distillery}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const country = mapCountry(countryLabel);
    if (!country) continue; // skip if we can't map the country

    const abv = abvRaw ? parseFloat(abvRaw) : null;
    const cleanAbv = (abv && abv > 0 && abv <= 100) ? abv : null;

    // Parse age from name (e.g. "Glenfiddich 12" or "12 Year Old")
    const ageMatch = name.match(/\b(\d{1,2})\s*(?:year|yr|yo|y\.o)/i) ?? name.match(/\b(\d{2})\b/);
    const age = ageMatch ? parseInt(ageMatch[1], 10) : null;
    const cleanAge = (age && age >= 3 && age <= 50) ? age : null;

    whiskies.push({
      name,
      distillery,
      country,
      region: regionLabel ?? null,
      type: row._type ?? mapType(row.typeLabel?.value),
      abv: cleanAbv,
      age_statement: cleanAge,
      description,
      status: 'approved',
    });
  }

  return whiskies;
}

async function insertBatch(whiskies) {
  // Fetch existing names to avoid duplicates
  const { data: existing } = await supabase
    .from('whiskies')
    .select('name, distillery');

  const existingKeys = new Set(
    (existing ?? []).map(w => `${w.name}__${w.distillery}`)
  );

  const toInsert = whiskies.filter(
    w => !existingKeys.has(`${w.name}__${w.distillery}`)
  );

  if (toInsert.length === 0) {
    console.log('No new whiskies to insert (all already exist)');
    return;
  }

  console.log(`Inserting ${toInsert.length} new whiskies (skipping ${whiskies.length - toInsert.length} duplicates)...`);

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    const { error } = await supabase.from('whiskies').insert(batch);
    if (error) {
      console.error(`Batch ${i / 100 + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  ${inserted}/${toInsert.length} inserted...`);
    }
  }
  console.log(`\nDone! Inserted ${inserted} whiskies.`);
}

// Main
try {
  const rows = await fetchFromWikidata();
  console.log(`Got ${rows.length} rows from Wikidata`);

  const whiskies = parseRows(rows);
  console.log(`Parsed ${whiskies.length} unique whiskies with distilleries`);

  if (whiskies.length === 0) {
    console.log('Nothing to insert.');
    process.exit(0);
  }

  // Preview first 5
  console.log('\nSample:');
  whiskies.slice(0, 5).forEach(w =>
    console.log(`  ${w.name} — ${w.distillery} (${w.country}, ${w.type})`)
  );
  console.log('');

  await insertBatch(whiskies);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
