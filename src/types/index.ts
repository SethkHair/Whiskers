export type WhiskyStatus = 'approved' | 'pending';
export type WhiskyType = 'single_malt' | 'blended' | 'bourbon' | 'rye' | 'irish' | 'japanese' | 'other';
export type ServingType = 'neat' | 'rocks' | 'water' | 'cocktail';
export type CollectionStatus = 'have' | 'want' | 'had';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Whisky {
  id: string;
  name: string;
  distillery: string;
  region: string | null;
  country: string;
  type: WhiskyType;
  age_statement: number | null;
  abv: number | null;
  description: string | null;
  status: WhiskyStatus;
  submitted_by: string | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  whisky_id: string;
  rating: number;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  overall_notes: string | null;
  serving_type: ServingType;
  date: string;
  created_at: string;
  whisky?: Whisky;
  profile?: Profile;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface Collection {
  id: string;
  user_id: string;
  whisky_id: string;
  status: CollectionStatus;
  created_at: string;
  whisky?: Whisky;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  WhiskyDetail: { whiskyId: string };
  LogDram: { whiskyId: string; whiskyName: string };
  SubmitWhisky: undefined;
  UserProfile: { userId: string };
  Distillery: { distillery: string };
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
  Badges: undefined;
};
