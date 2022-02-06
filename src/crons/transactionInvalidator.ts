import { DatabasePool, sql } from 'slonik';
import { CronJob } from './CronJob';
import { DAY } from '../utils/constants';

type TransactionInvalidatorCacheSpec = {
  localCachePool: DatabasePool;
  environment: Record<string, string>;
};

export default (spec: TransactionInvalidatorCacheSpec): CronJob => {
  const cronName = 'TRANSACTION_INVALIDATOR';
  const { localCachePool } = spec;

  const run = async () => {
    // Add a 0.5 day allowance before invalidating transactions
    const lastSevenDays = Date.now() - DAY * 7.5;
    const lastSevenDaysEpoch = lastSevenDays * 1_000_000;

    const res = await localCachePool.query(sql`
      delete from on_chain_transaction where block_timestamp < ${lastSevenDaysEpoch}
    `);

    console.log('successfully deleted on_chain_transaction', res);
  };

  return Object.freeze({
    isEnabled: !spec.environment['NO_UPDATE_CACHE'],
    cronName,
    schedule: '0 */8 * * *', // every day
    run,
  });
};
