export const BADGE_DEFINITIONS = [
  {
    id: 'first_dram',
    name: 'First Dram',
    description: 'Log your very first whisky check-in',
    icon: '🥃',
    criteria_type: 'checkin_count',
    criteria_value: 1,
  },
  {
    id: 'ten_drams',
    name: 'Ten Drams',
    description: 'Log 10 whisky check-ins',
    icon: '🔟',
    criteria_type: 'checkin_count',
    criteria_value: 10,
  },
  {
    id: 'fifty_drams',
    name: 'Fifty Drams',
    description: 'Log 50 whisky check-ins',
    icon: '🏅',
    criteria_type: 'checkin_count',
    criteria_value: 50,
  },
  {
    id: 'peat_head',
    name: 'Peat Head',
    description: 'Try 5 whiskies from the Islay region',
    icon: '💨',
    criteria_type: 'region_count',
    criteria_value: 5,
  },
  {
    id: 'bourbon_trail',
    name: 'Bourbon Trail',
    description: 'Try 5 different Bourbons',
    icon: '🌽',
    criteria_type: 'bourbon_count',
    criteria_value: 5,
  },
  {
    id: 'globe_trotter',
    name: 'Globe Trotter',
    description: 'Try whiskies from 5 different countries',
    icon: '🌍',
    criteria_type: 'country_count',
    criteria_value: 5,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Try whiskies from 3 different regions',
    icon: '🧭',
    criteria_type: 'region_variety',
    criteria_value: 3,
  },
];

export const WHISKY_REGIONS = [
  'Islay', 'Speyside', 'Highlands', 'Lowlands', 'Campbeltown',
  'Islands', 'Kentucky', 'Tennessee', 'Ireland', 'Japan',
  'Canada', 'India', 'Taiwan', 'Other',
];

export const WHISKY_COUNTRIES = [
  'Scotland', 'USA', 'Ireland', 'Japan', 'Canada',
  'India', 'Taiwan', 'Australia', 'Other',
];
