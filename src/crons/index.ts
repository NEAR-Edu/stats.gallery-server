import { DatabasePool } from 'slonik';
import { CronJob } from './CronJob';
import { createCacheJob } from './cache';
import OnChainTransactionsCache from './onChainTransactions';
import TransactionInvalidator from './transactionInvalidator';
import AppActionInvalidator from './appActionReceiptsInvalidator';
import AppTransactionReceiptCache from './appActionReceipts';

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

  const appActionInvalidator = AppActionInvalidator({
    localCachePool: cachePool,
  });

  const appReceiptActions = AppTransactionReceiptCache({
    localCachePool: cachePool,
    indexerCachepool: indexerPool,
    environment: environment,
  });

  return [
    createCacheJob(spec),
    onChainTransactions,
    transactionInvalidator,
    appReceiptActions,
    appActionInvalidator,
  ];
}
