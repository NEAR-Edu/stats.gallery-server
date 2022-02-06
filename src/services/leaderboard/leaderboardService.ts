interface TopWeeklyDapp {
  account_id: string;
  number_of_transactions: number;
}

interface LeaderboardService {
  Init(): Promise<void>;
  GetLeaderboardStats(): Promise<TopWeeklyDapp[]>;
}
