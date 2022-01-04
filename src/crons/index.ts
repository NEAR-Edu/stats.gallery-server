import { DatabasePool } from 'slonik';
import { CronJob } from './CronJob';
import { createCacheJob } from './cache';
import OnChainTransactionsCache from './onChainTransactions';
import TransactionInvalidator from './transactionInvalidator';
import RarityFractionUpdater from './rarityFranction';

export interface CronJobSpec {
  environment: Record<string, string>;
  cachePool: DatabasePool;
  indexerPool: DatabasePool;
}

export default function initCronJobs(spec: CronJobSpec): CronJob[] {
  const { environment, cachePool, indexerPool } = spec;

  const onChainTransactions = OnChainTransactionsCache({
    localCachePool: cachePool,
    indexerCachepool: indexerPool,
    environment: environment,
  });

  const transactionInvalidator = TransactionInvalidator({
    localCachePool: cachePool,
  });

  const rarityFractionCache = RarityFractionUpdater({
    localCachePool: cachePool,
    indexerCachePool: indexerPool,
  });

  return [
    createCacheJob(spec),
    onChainTransactions,
    transactionInvalidator,
    rarityFractionCache,
  ];
}
