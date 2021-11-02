import { DatabasePoolType, sql } from 'slonik';
import { CronJob } from './CronJob';
import totalNumberOfAccountsQuery from '../queries/all-accounts.sql';
import badgeRarityCount from '../queries/badge-rarity-nft-levels.sql';

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

  async function getUsersHavingSentNFTs(count: number): Promise<number> {
    return await indexerCachePool.oneFirst(badgeRarityCount(count)) as number;
  }

  async function run() {
    const [
      totalAccounts,
      totalAccountsWithOneNFTSent,
      totalAccountsWithTenNFTSent,
      TotalAccountsWithHundredNFTSent
    ] = await Promise.all([
      getTotalNumberOfAccounts(),
      getUsersHavingSentNFTs(1),
      getUsersHavingSentNFTs(10),
      getUsersHavingSentNFTs(100),
    ]);

    const rarityForSingleNFTTransfer = totalAccountsWithOneNFTSent/totalAccounts;
    const rarityForTenNFTTransfer = totalAccountsWithTenNFTSent/totalAccounts;
    const rarityForHundredNFTTransfer = TotalAccountsWithHundredNFTSent/totalAccounts;

    await localCachePool.query(
      sql`
        with badge_nft_group as (
          select id from badge_group where function_name = 'badge-nft'
        )
        update badge set rarity_fraction = ${rarityForSingleNFTTransfer} where badge_group_id = (select id from badge_nft_group);
      `
    );

    await localCachePool.query(
      sql`
        with badge_nft_group as (
          select id from badge_group where function_name = 'badge-nft'
        )
        update badge set rarity_fraction = ${rarityForTenNFTTransfer} where badge_group_id = (select id from badge_nft_group);
      `
    );

    await localCachePool.query(
      sql`
        with badge_nft_group as (
          select id from badge_group where function_name = 'badge-nft'
        )
        update badge set rarity_fraction = ${rarityForHundredNFTTransfer} where badge_group_id = (select id from badge_nft_group);
      `
    );
  }

  return Object.freeze({
    isEnabled: isEnabled(),
    cronName: cronName(),
    schedule: schedule(),
    run
  }) as unknown as CronJob
}
