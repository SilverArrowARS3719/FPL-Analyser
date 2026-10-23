export interface Team {
  id: number;
  name: string;
  short_name: string;
  code: number;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
  played: number;
  points: number;
  position: number;
  win: number;
  draw: number;
  loss: number;
}

export interface ElementType {
  id: number;
  singular_name: string;
  singular_name_short: string;
  plural_name: string;
}

export interface Player {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  team_code: number;
  element_type: number;
  status: string;
  now_cost: number;
  total_points: number;
  points_per_game: string;
  selected_by_percent: string;
  form: string;
  transfers_in: number;
  transfers_out: number;
  transfers_in_event: number;
  transfers_out_event: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  starts: number;
  chance_of_playing_next_round: number | null;
  news: string;
  photo: string;
  value_season: string;
  value_form: string;
}

export interface GameweekEvent {
  id: number;
  name: string;
  deadline_time: string;
  deadline_time_epoch: number;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_score: number | null;
  is_current: boolean;
  is_next: boolean;
  is_previous: boolean;
  can_enter: boolean;
  can_manage: boolean;
  released: boolean;
  ranked_count: number | null;
  transfers_made: number;
  chip_plays: { chip_name: string; num_played: number }[];
  most_selected: number | null;
  most_transferred_in: number | null;
  top_element: number | null;
  most_captained: number | null;
  most_vice_captained: number | null;
}

export interface Chip {
  id: number;
  name: string;
  number: number;
  start_event: number;
  stop_event: number;
  chip_type: string;
}

export interface Bootstrap {
  events: GameweekEvent[];
  teams: Team[];
  element_types: ElementType[];
  elements: Player[];
  total_players: number;
  chips: Chip[];
}

export interface Fixture {
  id: number;
  event: number | null;
  kickoff_time: string | null;
  finished: boolean;
  started: boolean | null;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}

export interface EntrySummary {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number | null;
  summary_overall_rank: number | null;
  current_event: number | null;
  last_deadline_bank: number | null;
  last_deadline_value: number | null;
  last_deadline_total_transfers: number;
}

export interface EntryPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface EntryPicksResponse {
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: EntryPick[];
}

export interface LiveElementStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  bps: number;
  total_points: number;
  in_dreamteam: boolean;
}

export interface LiveElement {
  id: number;
  stats: LiveElementStats;
}

export interface EventLive {
  elements: LiveElement[];
}

/** One this-season gameweek row for a player (empty array pre-season). */
export interface ElementSummaryHistoryEntry {
  element: number;
  round: number;
  opponent_team: number;
  was_home: boolean;
  minutes: number;
  total_points: number;
  starts: number;
  goals_scored: number;
  assists: number;
  bonus: number;
  expected_goal_involvements: string;
}

/** One past-season aggregate row for a player (chronological ascending). */
export interface ElementSummaryHistoryPast {
  season_name: string;
  start_cost: number;
  end_cost: number;
  total_points: number;
  minutes: number;
  starts: number;
  goals_scored: number;
  assists: number;
  bonus: number;
  expected_goal_involvements: string;
}

export interface ElementSummaryResponse {
  history: ElementSummaryHistoryEntry[];
  history_past: ElementSummaryHistoryPast[];
}

/** Position ids used throughout the FPL API. */
export const POSITION = { GKP: 1, DEF: 2, MID: 3, FWD: 4 } as const;
