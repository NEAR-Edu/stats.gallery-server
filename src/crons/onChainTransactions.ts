import { DatabasePoolType, sql } from "slonik";
import { CronJob } from './CronJob';
import { DAY } from '../utils/constants';

type OnChainTransactionsCacheSpec = {
  localCachePool: DatabasePoolType,
  indexerCachepool: DatabasePoolType,
  environment: Record<string, string>
}

interface txnProps {
  transaction_hash: string;
  included_in_block_hash: string;
  included_in_chunk_hash: string;
  index_in_chunk: number,
  block_timestamp: number,
  signer_account_id: string,
  signer_public_key: string,
  nonce: number,
  receiver_account_id: string,
  signature: string,
  status: string,
  receipt_conversion_gas_burnt: number,
  receipt_conversion_tokens_burnt: number,
}

type localCacheTxn = Omit<txnProps, "included_in_block_hash" | "included_in_chunk_hash">

export default (spec: OnChainTransactionsCacheSpec): CronJob => {
  const { localCachePool, indexerCachepool } = spec;
  const cronName = 'TRANSACTIONS_CACHE';

  const run = async () => {
    // STEP 1: determine the starting epoch — if this is the first time for the job to run, create a new entry
    let firstRun = false;
    const startEpoch = await (async () => {
      const lastUpdate = await localCachePool.oneFirst(sql`
        select block_timestamp from last_update where cron_name = ${cronName}
      `) as number;

      if (lastUpdate === null) {
        const lastSevenDays = Date.now() - DAY * 7;
        const lastSevenDaysEpoch = lastSevenDays * 1_000_000;

        await localCachePool.query(sql`
          insert into last_update (block_height, cron_name, block_timestamp) 
            values (${null}, ${cronName}, ${lastSevenDaysEpoch})
        `);
        firstRun = true;
        return lastSevenDaysEpoch;
      }

      return startEpoch;
    })();

    // exclude all the columns that were not part of the local cache schema
    // TODO: make the unnest clearer
    const txns = await indexerCachepool.many(sql`
      select * from transactions where block_timestamp >= ${startEpoch}
    `);
    const cacheTxns = txns.map(tx => tx as unknown as localCacheTxn) as readonly any[];
    await localCachePool.query(sql`
      insert into 
        on_chain_transactions
      values
        (${sql.unnest(cacheTxns, ['string', 'number', 'number', 'string', 'string', 'number', 'string', 'string', 'string', 'number', 'number'])})
    `)

    // update the last_update table
    const lastTxn = cacheTxns[cacheTxns.length];
    const lastBlockTimestamp = lastTxn.block_timestamp as number;
    await localCachePool.query(sql`update last_update set block_timestamp = ${lastBlockTimestamp}`);

  }

  return Object.freeze({
    isEnabled: true,
    cronName,
    schedule: '*/10 * * * *', // every 10 minutes,
    run
  })
}