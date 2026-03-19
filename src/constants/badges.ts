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
  {
    id: 'first_drop',
    name: 'First Drop',
    description: 'Get your first whisky submission approved',
    icon: '💧',
    criteria_type: 'submitted_count',
    criteria_value: 1,
  },
  {
    id: 'nosing_around',
    name: 'Nosing Around',
    description: 'Get 5 whisky submissions approved',
    icon: '👃',
    criteria_type: 'submitted_count',
    criteria_value: 5,
  },
  {
    id: 'whisky_scout',
    name: 'Whisky Scout',
    description: 'Get 10 whisky submissions approved',
    icon: '🔍',
    criteria_type: 'submitted_count',
    criteria_value: 10,
  },
  {
    id: 'curator',
    name: 'Curator',
    description: 'Get 25 whisky submissions approved',
    icon: '📚',
    criteria_type: 'submitted_count',
    criteria_value: 25,
  },
  {
    id: 'cellar_master',
    name: 'Cellar Master',
    description: 'Get 50 whisky submissions approved',
    icon: '🗝️',
    criteria_type: 'submitted_count',
    criteria_value: 50,
  },
  {
    id: 'distillers_choice',
    name: "Distiller's Choice",
    description: 'Get 100 whisky submissions approved',
    icon: '🏆',
    criteria_type: 'submitted_count',
    criteria_value: 100,
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

import { WhiskyType } from '../types';

export const COUNTRY_TYPES: Record<string, WhiskyType[]> = {
  Scotland:  ['single_malt', 'blended'],
  USA:       ['bourbon', 'rye', 'other'],
  Ireland:   ['irish', 'blended', 'other'],
  Japan:     ['japanese', 'single_malt', 'blended', 'other'],
  Canada:    ['blended', 'rye', 'other'],
  India:     ['single_malt', 'blended', 'other'],
  Taiwan:    ['single_malt', 'other'],
  Australia: ['single_malt', 'blended', 'other'],
  Other:     ['single_malt', 'blended', 'bourbon', 'rye', 'irish', 'japanese', 'other'],
};

export const COUNTRY_REGIONS: Record<string, string[]> = {
  Scotland:  ['Speyside', 'Highlands', 'Islay', 'Lowlands', 'Campbeltown', 'Islands'],
  USA:       ['Kentucky', 'Tennessee', 'Other'],
  Ireland:   ['Other'],
  Japan:     ['Other'],
  Canada:    ['Other'],
  India:     ['Other'],
  Taiwan:    ['Other'],
  Australia: ['Other'],
  Other:     ['Other'],
};
