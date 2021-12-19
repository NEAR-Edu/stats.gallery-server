import { DatabasePoolType } from 'slonik';
import { CronJob } from './CronJob';
import { createCacheJob } from './cache';
import OnChainTransactionsCache from './onChainTransactions';

export interface CronJobSpec {
  environment: Record<string, string>;
  cachePool: DatabasePoolType;
  indexerPool: DatabasePoolType;
}

export default function initCronJobs(spec: CronJobSpec): CronJob[] {
  const { environment, cachePool, indexerPool } = spec;

  const onChainTransactions = OnChainTransactionsCache({
    localCachePool: cachePool,
    indexerCachepool: indexerPool,
    environment: environment,
  })

  return [createCacheJob(spec), onChainTransactions];
}
