export type HistoryPlatformRow = {
  id: string;
  platform: string;
  status: string;
  publishedAt: string | null;
  error: string | null;
};

export type HistoryPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  platforms: HistoryPlatformRow[];
};
