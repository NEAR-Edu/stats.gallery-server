export interface BadgeService {
  IsBadgeAttained(accountId: string): Promise<boolean>;
  Init(): void;
}
