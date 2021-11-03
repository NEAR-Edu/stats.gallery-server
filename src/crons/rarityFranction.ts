import { DatabasePoolType, sql } from 'slonik';
import { CronJob } from './CronJob';
import totalNumberOfAccountsQuery from '../queries/all-accounts.sql';
import badgeReceiveNFTGroup from '../queries/badge-nft-receive-levels.sql';
import badgeTransfersGroupCount from '../queries/badge-transfer-levels.sql';

interface RarityFractionSpec {
  localCachePool: DatabasePoolType;
  indexerCachePool: DatabasePoolType;
}

export default (spec: RarityFractionSpec): CronJob =>  {
  const { localCachePool, indexerCachePool } = spec;

  function isEnabled(): boolean {
    return true;
  }

  function cronName(): string {
    return 'RARITY_FRACTION';
  }

  function schedule(): string {
    return '*/1 * * * *';
  }

  async function getTotalNumberOfAccounts(): Promise<number> {
    return await indexerCachePool.oneFirst(totalNumberOfAccountsQuery()) as number;
  }

  async function getUsersHavingSentTokens(count: number): Promise<number> {
    return await indexerCachePool.oneFirst(badgeTransfersGroupCount(count)) as number;
  }

  async function getUsersReceiveNFT(): Promise<number> {
    return await indexerCachePool.oneFirst(badgeReceiveNFTGroup()) as number;
  }

  async function updateRarityFractionTokensSent(rarity: number, nftGroupCounter: number) {
    return await localCachePool.query(sql`
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
    `)
  }

  async function updateRarityFractionNFTReceive(rarity: number) {
    return await localCachePool.query(sql`
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

  async function run() {
    const [
      totalAccounts,
      totalAccountsWithOneNFTSent,
      totalAccountsWithTenNFTSent,
      totalAccountsWithHundredNFTSent,
      totalNFTReceivedGroupedByUser
    ] = await Promise.all([
      getTotalNumberOfAccounts(),
      getUsersHavingSentTokens(1),
      getUsersHavingSentTokens(10),
      getUsersHavingSentTokens(100),
      getUsersReceiveNFT()
    ]);

    const rarityForSingleTokenTransfer = totalAccountsWithOneNFTSent/totalAccounts;
    const rarityForTenTokenTransfer = totalAccountsWithTenNFTSent/totalAccounts;
    const rarityForHundredTokenTransfer = totalAccountsWithHundredNFTSent/totalAccounts;
    const rarityForNFTReceive = totalNFTReceivedGroupedByUser/totalAccounts

    await Promise.all([
      updateRarityFractionTokensSent(rarityForSingleTokenTransfer, 1),
      updateRarityFractionTokensSent(rarityForTenTokenTransfer, 10),
      updateRarityFractionTokensSent(rarityForHundredTokenTransfer, 100),
      updateRarityFractionNFTReceive(rarityForNFTReceive)
    ]);
  }

  return Object.freeze({
    isEnabled: isEnabled(),
    cronName: cronName(),
    schedule: schedule(),
    run
  }) as unknown as CronJob
}
