import { DatabasePoolType } from 'slonik';
import { LeaderboardCache } from './leaderboards';
import RarityFractionUpdater from './rarityFranction';

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

  const rarityFractionCache = RarityFractionUpdater({ localCachePool: cachePool, indexerCachePool: indexerPool })

  return [leaderboardCache, rarityFractionCache];
}
