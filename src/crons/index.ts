import { DatabasePoolType } from 'slonik';
import { LeaderboardCache } from './leaderboards';
import OnChainTransactionsCache from './onChainTransactions';

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

  const onChainTransactions = OnChainTransactionsCache({
    localCachePool: cachePool,
    indexerCachepool: indexerPool,
    environment: environment,
  })

  return [leaderboardCache, onChainTransactions];
}
