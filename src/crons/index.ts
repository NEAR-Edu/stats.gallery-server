import { DatabasePoolType } from 'slonik';
import { LeaderboardCache } from './leaderboards';

export interface CronsSpec {
  environment: Record<string, string>;
  cachePool: DatabasePoolType;
  indexerPool: DatabasePoolType;
}

export default function initCrons(spec: CronsSpec) {
  const { environment, cachePool, indexerPool } = spec;

  const leaderboardCache = new LeaderboardCache(
    cachePool,
    indexerPool,
    environment,
  );

  return [leaderboardCache];
}
