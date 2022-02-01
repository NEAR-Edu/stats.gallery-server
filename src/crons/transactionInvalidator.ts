import { DatabasePool, sql } from 'slonik';
import { CronJob } from './CronJob';
import { DAY } from '../utils/constants';

type TransactionInvalidatorCacheSpec = {
  localCachePool: DatabasePool;
  environment: Record<string, string>;
  nearNetwork: string;
};

export default (spec: TransactionInvalidatorCacheSpec): CronJob => {
  const { localCachePool, nearNetwork } = spec;
  const cronName = `${nearNetwork.toUpperCase()}_TRANSACTION_INVALIDATOR`;

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
    isEnabled: !spec.environment['NO_UPDATE_CACHE'],
    cronName,
    schedule: '0 0 * * *', // every day
    run,
  });
};
