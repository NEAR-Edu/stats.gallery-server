export interface BadgeService {
  IsBadgeAttained(
    accountId: string,
  ): Promise<boolean> | Promise<readonly any[]>;
  Init(): void;
}
