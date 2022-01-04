import {
  DatabasePool,
  DatabaseTransactionConnection,
  DatabasePoolConnection,
  sql,
  NotFoundError,
} from 'slonik';
import { CronJob } from './CronJob';
import totalNumberOfAccountsQuery from '../queries/all-accounts.sql';
import badgeReceiveNFTGroup from '../queries/badge-nft-receive-levels.sql';
import badgeTransfersGroupCount from '../queries/badge-transfer-levels.sql';
import { DAY } from '../utils/constants';
import { TimestampRange } from '../queries/Params';

interface RarityFractionSpec {
  localCachePool: DatabasePool;
  indexerCachePool: DatabasePool;
}

export default (spec: RarityFractionSpec): CronJob => {
  const { localCachePool, indexerCachePool } = spec;
  const cronName = 'RARITY_FRACTION';

  async function getTotalNumberOfAccounts(
    txConn: DatabaseTransactionConnection,
  ): Promise<number> {
    return (await txConn.oneFirst(totalNumberOfAccountsQuery())) as number;
  }

  async function getUsersHavingSentTokens(
    count: number,
    range: TimestampRange,
    txConn: DatabaseTransactionConnection,
  ): Promise<number> {
    return (await txConn.oneFirst(
      badgeTransfersGroupCount(range, count),
    )) as number;
  }

  async function getUsersReceiveNFT(
    range: TimestampRange,
    tx: DatabaseTransactionConnection,
  ): Promise<number> {
    return (await tx.oneFirst(badgeReceiveNFTGroup(range))) as number;
  }

  async function updateRarityFractionTokensSent(
    rarity: number,
    nftGroupCounter: number,
    txConn: DatabaseTransactionConnection,
  ) {
    return await txConn.query(sql`
      with badge_token_group as (
        select id from badge_group where function_name = 'badge-transfer'
      )
      update
        badge
      set
        rarity_fraction = ${rarity}
      where
        badge_group_id = (select id from badge_token_group)
        and required_value = ${nftGroupCounter}
    `);
  }

  async function updateRarityFractionNFTReceive(
    rarity: number,
    txConn: DatabaseTransactionConnection,
  ) {
    return await txConn.query(sql`
      with badge_nft_group as (
        select id from badge_group where function_name = 'badge-nft'
      )
      update
        badge
      set
        rarity_fraction = ${rarity}
      where
        badge_group_id = (select id from badge_nft_group);
    `);
  }

  async function getLastBlockTimeStamp(
    txConn: DatabasePoolConnection,
    nameSpace: string,
  ): Promise<number> {
    let lastUpdate: number;
    try {
      lastUpdate = (await txConn.oneFirst(sql`
        select block_timestamp from last_update where cron_name = ${nameSpace}
      `)) as number;
    } catch (error) {
      if (error instanceof NotFoundError) {
        await txConn.query(sql`
          insert into last_update (block_height, cron_name, block_timestamp) 
            values (${null}, ${nameSpace}, 0)
        `);
        return 0;
      }

      throw error;
    }

    return lastUpdate;
  }

  async function run() {
    const sentTokensNameSpace = `${cronName + '_' + 'SENT_TOKENS'}`;
    const receiveNFTNameSpace = `${cronName + '_' + 'RECEIVE_NFT'}`;
    const startEpochSentTokens = await getLastBlockTimeStamp(
      localCachePool,
      sentTokensNameSpace,
    );
    const startEpochReceiveNft = await getLastBlockTimeStamp(
      localCachePool,
      receiveNFTNameSpace,
    );

    const endEpochSentTokens: number =
      startEpochSentTokens + DAY * 1 * 1_000_000;
    console.log(`startEpoch ${sentTokensNameSpace}`, startEpochSentTokens);
    console.log(`endEpoch ${sentTokensNameSpace}`, endEpochSentTokens);

    const rangeSentTokens = {
      after_block_timestamp: startEpochSentTokens,
      before_block_timestamp: endEpochSentTokens,
    };

    const endEpochReceiveNFT: number =
      startEpochReceiveNft + DAY * 1 * 1_000_000;
    console.log(`startEpoch ${receiveNFTNameSpace}`, startEpochReceiveNft);
    console.log(`endEpoch ${receiveNFTNameSpace}`, endEpochReceiveNFT);
    const rangeReceiveNft = {
      after_block_timestamp: startEpochReceiveNft,
      before_block_timestamp: endEpochReceiveNFT,
    };
    indexerCachePool.transaction(async txConnection => {
      const [
        totalAccounts,
        totalAccountsWithOneNFTSent,
        totalAccountsWithTenNFTSent,
        totalAccountsWithHundredNFTSent,
        totalNFTReceivedGroupedByUser,
      ] = await Promise.all([
        getTotalNumberOfAccounts(txConnection),
        getUsersHavingSentTokens(1, rangeSentTokens, txConnection),
        getUsersHavingSentTokens(10, rangeSentTokens, txConnection),
        getUsersHavingSentTokens(100, rangeSentTokens, txConnection),
        getUsersReceiveNFT(rangeReceiveNft, txConnection),
      ]);

      localCachePool.transaction(async localTxConn => {
        // TODO: query existing value then add the new query value
        // FIXME: will need to change query as we will need to know which receiver ids are already present?
        const rarityForSingleTokenTransfer =
          totalAccountsWithOneNFTSent / totalAccounts;
        const rarityForTenTokenTransfer =
          totalAccountsWithTenNFTSent / totalAccounts;
        const rarityForHundredTokenTransfer =
          totalAccountsWithHundredNFTSent / totalAccounts;
        const rarityForNFTReceive =
          totalNFTReceivedGroupedByUser / totalAccounts;

        await Promise.all([
          updateRarityFractionTokensSent(
            rarityForSingleTokenTransfer,
            1,
            localTxConn,
          ),
          updateRarityFractionTokensSent(
            rarityForTenTokenTransfer,
            10,
            localTxConn,
          ),
          updateRarityFractionTokensSent(
            rarityForHundredTokenTransfer,
            100,
            localTxConn,
          ),
          updateRarityFractionNFTReceive(rarityForNFTReceive, localTxConn),
        ]);

        // update progress

        // sent tokens
        await localTxConn.query(
          sql`update last_update set block_timestamp = ${endEpochSentTokens} where cron_name = ${sentTokensNameSpace}`,
        );

        // receive nft
        await localTxConn.query(
          sql`update last_update set block_timestamp = ${endEpochReceiveNFT} where cron_name = ${receiveNFTNameSpace}`,
        );
      });
    });
  }

  return Object.freeze({
    isEnabled: true,
    cronName: cronName,
    schedule: '*/5 * * * *', // every day,
    run,
  }) as unknown as CronJob;
};
