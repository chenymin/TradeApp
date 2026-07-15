export type DashboardProfile = {
  id: string;
  inviteCode: string | null;
  nickname: string | null;
  referralPoints: number;
  reputationPoints: number;
  taskPoints: number;
  tier: string | null;
  totalPoints: number;
  tradingPoints: number;
  userType: string | null;
};

export type DashboardProfileRepository = {
  fetchProfile(viewerId: string): Promise<DashboardProfile>;
};
