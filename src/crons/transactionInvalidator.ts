import { DatabasePool, sql } from 'slonik';
import { CronJob } from './CronJob';
import { DAY } from '../utils/constants';

type TransactionInvalidatorCacheSpec = {
  localCachePool: DatabasePool;
};

export default (spec: TransactionInvalidatorCacheSpec): CronJob => {
  const cronName = 'TRANSACTION_INVALIDATOR';
  const { localCachePool } = spec;

  const run = async () => {
    // Add a 1 day allowance before invalidating transactions
    const lastSevenDays = Date.now() - DAY * 8;
    const lastSevenDaysEpoch = lastSevenDays * 1_000_000;

    const res = await localCachePool.query(sql`
      delete from on_chain_transaction where block_timestamp < ${lastSevenDaysEpoch}
    `);

    console.log('successfully deleted on_chain_transaction', res);
  };

  return Object.freeze({
    isEnabled: true,
    cronName,
    schedule: '0 0 * * *', // every day
    run,
  });
};
