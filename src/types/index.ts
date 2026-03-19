export type WhiskyStatus = 'approved' | 'pending';
export type WhiskyType = 'single_malt' | 'blended' | 'bourbon' | 'rye' | 'irish' | 'japanese' | 'other';
export type ServingType = 'neat' | 'rocks' | 'water' | 'cocktail';
export type CollectionStatus = 'have' | 'want' | 'had';
export type NotificationType = 'follow' | 'like' | 'comment';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Distillery {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  founded_year: number | null;
  description: string | null;
  website: string | null;
  parent_id: string | null;
  created_at: string;
  // Joined fields
  parent?: Distillery;
  children?: Distillery[];
}

export interface Whisky {
  id: string;
  name: string;
  distillery: string;
  distillery_id: string | null;
  region: string | null;
  country: string;
  type: WhiskyType;
  age_statement: number | null;
  abv: number | null;
  description: string | null;
  flavor_tags: string[];
  status: WhiskyStatus;
  submitted_by: string | null;
  created_at: string;
  distillery_profile?: Distillery;
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

export interface Like {
  user_id: string;
  checkin_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  checkin_id: string;
  body: string;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  checkin_id: string | null;
  comment_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
  checkin?: Checkin & { whisky?: Whisky };
}

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  WhiskyDetail: { whiskyId: string };
  LogDram: { whiskyId: string; whiskyName: string };
  SubmitWhisky: undefined;
  UserProfile: { userId: string };
  Distillery: { distillery: string; distilleryId?: string };
  EditProfile: undefined;
  AdminApproval: undefined;
  Comments: { checkinId: string; checkinUserId: string };
  Notifications: undefined;
  FollowList: { userId: string; mode: 'followers' | 'following' };
  AdminDistillery: undefined;
  EditDistillery: { distilleryId?: string };
  EditWhisky: { whiskyId: string };
  QuickLog: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
  Badges: undefined;
};
