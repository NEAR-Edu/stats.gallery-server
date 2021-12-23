import { DatabasePool, sql, NotFoundError } from 'slonik';
import { CronJob } from './CronJob';
import { DAY, MINUTE } from '../utils/constants';

type OnChainTransactionsCacheSpec = {
  localCachePool: DatabasePool;
  indexerCachepool: DatabasePool;
  environment: Record<string, string>;
};

interface txnProps {
  transaction_hash: string;
  included_in_block_hash: string;
  included_in_chunk_hash: string;
  index_in_chunk: number;
  block_timestamp: number;
  signer_account_id: string;
  signer_public_key: string;
  nonce: number;
  receiver_account_id: string;
  signature: string;
  status: string;
  converted_into_receipt_id: string;
  receipt_conversion_gas_burnt: number;
  receipt_conversion_tokens_burnt: number;
}

type localCacheTxn = Omit<
  txnProps,
  | 'included_in_block_hash'
  | 'included_in_chunk_hash'
  | 'converted_into_receipt_id'
>;

export default (spec: OnChainTransactionsCacheSpec): CronJob => {
  const { localCachePool, indexerCachepool } = spec;
  const cronName = 'TRANSACTIONS_CACHE';

  const run = async () => {
    // STEP 1: determine the starting epoch — if this is the first time for the job to run, create a new entry
    let firstRun = false;
    const startEpoch = await (async (): Promise<number> => {
      let lastUpdate: number;
      try {
        lastUpdate = (await localCachePool.oneFirst(sql`
          select block_timestamp from last_update where cron_name = ${cronName}
        `)) as number;
      } catch (error) {
        if (error instanceof NotFoundError) {
          const lastSevenDays = Date.now() - DAY * 7;
          const lastSevenDaysEpoch = lastSevenDays * 1_000_000;

          await localCachePool.query(sql`
            insert into last_update (block_height, cron_name, block_timestamp) 
              values (${null}, ${cronName}, ${lastSevenDaysEpoch})
          `);
          firstRun = true;
          return lastSevenDaysEpoch;
        }

        throw error;
      }

      return lastUpdate;
    })();

    console.log('startEpoch', startEpoch);

    // exclude all the columns that were not part of the local cache schema
    const endEpoch: number = startEpoch + MINUTE * 30 * 1_000_000;
    console.log('endEpoch', endEpoch);
    indexerCachepool.transaction(async txConnection => {
      const txns = await txConnection.many(sql`
        select
          transaction_hash,
          index_in_chunk,
          block_timestamp,
          signer_account_id,
          signer_public_key,
          nonce,
          receiver_account_id,
          signature,
          status,
          receipt_conversion_gas_burnt,
          receipt_conversion_tokens_burnt
        from
          transactions
        where
          block_timestamp > ${startEpoch} and block_timestamp <= ${endEpoch}
      `);
      // return early since there's no on chain tx to process
      if (!txns) {
        return;
      }
      const cacheTxns = txns.map(tx => Object.values(tx)) as readonly any[];

      localCachePool.transaction(async localTxConn => {
        await localTxConn.query(sql`
          insert into 
            on_chain_transaction
          (
            ${sql`transaction_hash,`}
            ${sql`index_in_chunk,`}
            ${sql`block_timestamp,`}
            ${sql`signer_account_id,`}
            ${sql`signer_public_key,`}
            ${sql`nonce,`}
            ${sql`receiver_account_id,`}
            ${sql`signature,`}
            ${sql`status,`}
            ${sql`receipt_conversion_gas_burnt,`}
            ${sql`receipt_conversion_tokens_burnt`}
          )
          select * from
            ${sql.unnest(cacheTxns, [
              'text',
              'int4',
              'numeric',
              'text',
              'text',
              'numeric',
              'text',
              'text',
              'execution_outcome_status',
              'numeric',
              'numeric',
            ])}
          returning *
        `);

        // update the last_update table
        const lastTxn = txns[txns.length - 1] as localCacheTxn;
        const lastBlockTimestamp = lastTxn.block_timestamp as number;
        await localTxConn.query(
          sql`update last_update set block_timestamp = ${lastBlockTimestamp} where cron_name = ${cronName}`,
        );
      });
    });
  };

  return Object.freeze({
    isEnabled: true,
    cronName,
    schedule: '*/1 * * * *', // every 10 minutes,
    run,
  });
};
