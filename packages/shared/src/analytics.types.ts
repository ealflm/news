export interface AnalyticsKpis {
  range: string;
  posts: { total: number; published: number };
  views: { total: number; deltaPercent: number };
  clicks: { total: number; deltaPercent: number };
  ctr: { value: number; deltaPercent: number };
}

export interface AnalyticsTimeSeriesPoint {
  day: string; // YYYY-MM-DD
  views: number;
  clicks: number;
}

export interface AnalyticsTopPost {
  postId: string;
  title: string;
  slug: string | null;
  views: number;
  clicks: number;
}

export interface AnalyticsTopPopup {
  popupId: string;
  name: string;
  clicks: number;
  ctr: number;
}

export interface AnalyticsOverviewResponse {
  kpis: AnalyticsKpis;
  series: AnalyticsTimeSeriesPoint[];
  topPosts: AnalyticsTopPost[];
  topPopups: AnalyticsTopPopup[];
}
