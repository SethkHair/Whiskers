import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ohqaiilwnozhmkeajpjx.supabase.co',
  'sb_publishable_RepHYcYKewegHEih179keA_GmjhlI8N'
);

const whiskies = [
  {
    name: 'Jim Beam White Label',
    distillery: 'Jim Beam',
    country: 'USA',
    region: 'Kentucky',
    type: 'bourbon',
    age_statement: 4,
    abv: 40,
    description: 'The world\'s best-selling bourbon. Light and approachable with notes of vanilla, oak, and a hint of sweetness. A classic entry-level American whiskey.',
    status: 'approved',
  },
  {
    name: "Jack Daniel's Old No. 7",
    distillery: "Jack Daniel's",
    country: 'USA',
    region: 'Tennessee',
    type: 'other',
    age_statement: null,
    abv: 40,
    description: 'Tennessee whiskey filtered through 10 feet of sugar maple charcoal before aging — the Lincoln County Process. Smooth and mellow with notes of caramel, vanilla, and toasted oak.',
    status: 'approved',
  },
  {
    name: 'Wild Turkey 101',
    distillery: 'Wild Turkey',
    country: 'USA',
    region: 'Kentucky',
    type: 'bourbon',
    age_statement: null,
    abv: 50.5,
    description: 'A high-proof Kentucky bourbon with bold flavors of spice, caramel, vanilla, and a long peppery finish. Aged in heavily charred barrels for extra depth.',
    status: 'approved',
  },
  {
    name: 'Buffalo Trace',
    distillery: 'Buffalo Trace',
    country: 'USA',
    region: 'Kentucky',
    type: 'bourbon',
    age_statement: null,
    abv: 40,
    description: 'A deep amber bourbon with a complex aroma of vanilla, mint, and molasses. Rich and complex on the palate with notes of brown sugar and spice. One of the most awarded distilleries in the world.',
    status: 'approved',
  },
];

const { data, error } = await supabase.from('whiskies').select('name, distillery, status');

if (error) {
  console.error('Error:', error.message);
} else {
  console.log(`Found ${data.length} whiskies:`);
  data.forEach(w => console.log(` ✓ ${w.name} (${w.status})`));
}
