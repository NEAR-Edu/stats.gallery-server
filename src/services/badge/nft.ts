import { BadgeService } from './badgeService';
import { createPool, DatabasePool, sql } from 'slonik';
import { createClient } from 'redis';
import badgeNftSql from '../../queries/badge-nft.sql';
import badgeFunctionDetails from '../../queries/badge-function-details.sql';

interface NFTBadgeSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
}

export default (spec: NFTBadgeSpec): BadgeService => {
  const serviceName = 'badge_nft_service';
  const cacheLayer = createClient({ url: process.env['REDIS_URL'] });
  let indexerPool: DatabasePool;
  let statsGalleryCache: DatabasePool;

  const init = async () => {
    await cacheLayer.connect();

    indexerPool = createPool(spec.dbConnectionString, {
      maximumPoolSize: 30,
      statementTimeout: 'DISABLE_TIMEOUT',
      connectionTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      // this has to be set manually as there is a misleading error in the slonik package
      // saying this is unknown when this is not manually set
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });

    console.log(
      'Pool test:',
      spec.dbConnectionString,
      await indexerPool.one(sql`select 1 as should_be_1`),
    );

    statsGalleryCache = createPool(spec.statsGalleryConnectionString, {
      maximumPoolSize: 30,
      statementTimeout: 'DISABLE_TIMEOUT',
      connectionTimeout: 'DISABLE_TIMEOUT',
      idleTimeout: 'DISABLE_TIMEOUT',
      // this has to be set manually as there is a misleading error in the slonik package
      // saying this is unknown when this is not manually set
      idleInTransactionSessionTimeout: 'DISABLE_TIMEOUT',
    });
  };

  const isBadgeAttained = async (
    accountId: string,
  ): Promise<readonly any[]> => {
    const redisKey = serviceName + '_' + accountId;
    const cachedValue = await cacheLayer.get(redisKey);
    if (cachedValue !== null) {
      return JSON.parse(cachedValue) as readonly any[];
    }

    const nftBadges = await statsGalleryCache.query(
      badgeFunctionDetails('badge-nft'),
    );

    const result = await indexerPool.one(
      badgeNftSql({ account_id: accountId }),
    );

    const performedNFTTransfer = Boolean(result.result);

    if (performedNFTTransfer) {
      const attainedBadges = [];
      const transfers = Number(result!.result) || 0;
      for (const badge of nftBadges.rows) {
        if (transfers >= Number(badge.required_value)) {
          attainedBadges.push({
            attained_value: transfers,
            badge_group_id: badge.badge_group_id,
            badge_name: badge.badge_name,
            badge_description: badge.badge_description,
            required_value: badge.required_value,
            rarity_fraction: badge.rarity_fraction,
          });
        }
      }

      if (attainedBadges.length > 0) {
        await statsGalleryCache.query(sql`
          insert
            into
          account_badge (badge_group_id, attained_value, account_id)
          values (${attainedBadges[0].badge_group_id}, ${transfers}, (select id from account where account_id = ${accountId}))
          on conflict on constraint account_badge_badge_group_account_idx
          do
            update set attained_value = ${transfers}
        `);

        await cacheLayer.set(redisKey, JSON.stringify(attainedBadges), {
          EX: 3_600,
        });

        return attainedBadges as readonly any[];
      }

      return [] as readonly any[];
    }

    // we set an expiration period for when the value we get is false as to give a chance
    // for redis to be replinished just in case the user completes the badge in the future
    await cacheLayer.set(redisKey, JSON.stringify([]), { EX: 600 });

    return [] as readonly any[];
  };

  return Object.freeze({
    IsBadgeAttained: isBadgeAttained,
    Init: init,
  });
};
