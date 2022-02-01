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
  nearNetwork: string;
}

export default function initCronJobs(spec: CronJobSpec): CronJob[] {
  const { environment, cachePool, indexerPool, nearNetwork } = spec;

  const onChainTransactions = OnChainTransactionsCache({
    localCachePool: cachePool,
    indexerCachepool: indexerPool,
    environment: environment,
    nearNetwork,
  });

  const transactionInvalidator = TransactionInvalidator({
    localCachePool: cachePool,
    environment: environment,
    nearNetwork,
  });

  const appActionInvalidator = AppActionInvalidator({
    localCachePool: cachePool,
    environment: environment,
    nearNetwork
  });

  const appReceiptActions = AppTransactionReceiptCache({
    localCachePool: cachePool,
    indexerCachepool: indexerPool,
    environment: environment,
    nearNetwork,
  });

  return [
    createCacheJob(spec),
    onChainTransactions,
    transactionInvalidator,
    appReceiptActions,
    appActionInvalidator,
  ];
}
