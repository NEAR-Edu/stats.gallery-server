import Router from '@koa/router';
import NFTBadgeService from '../../services/badge/nft';
import TransferPerformedBadgeService from '../../services/badge/transfer';
import StakePerformedBadgeService from '../../services/badge/stake';

interface NFTControllerSpec {
  dbConnectionString: string;
  statsGalleryConnectionString: string;
}

export default async (spec: NFTControllerSpec): Promise<Router> => {
  const controllers = new Router();
  const nftBadgeService = NFTBadgeService({
    dbConnectionString: spec.dbConnectionString,
    statsGalleryConnectionString: spec.statsGalleryConnectionString,
  });
  const transferBadgeService = TransferPerformedBadgeService({
    dbConnectionString: spec.dbConnectionString,
    statsGalleryConnectionString: spec.statsGalleryConnectionString,
  });
  const stakeBadgeService = StakePerformedBadgeService({
    dbConnectionString: spec.dbConnectionString,
    statsGalleryConnectionString: spec.statsGalleryConnectionString,
  });
  try {
    await nftBadgeService.Init();
    await transferBadgeService.Init();
    await stakeBadgeService.Init();
  } catch (error) {
    console.error(error);
  }

  controllers.get('/v2/badge-nft', async (ctx, next) => {
    try {
      const { query } = ctx.request;
      if (query.account_id === undefined || query.account_id === null) {
        ctx.response.status = 400;
        ctx.response.body = {
          message: 'account_id is required',
        };
        await next();
      }

      const res = await nftBadgeService.IsBadgeAttained(
        query.account_id as string,
      );
      ctx.response.body = { result: res };
    } catch (error) {
      console.log(
        `something went wrong while fetching user's nft badge eligibility`,
        error,
      );
      ctx.response.status = 500;
    }
    await next();
  });

  controllers.get('/v2/badge-transfer', async (ctx, next) => {
    try {
      const { query } = ctx.request;
      if (query.account_id === undefined || query.account_id === null) {
        ctx.response.status = 400;
        ctx.response.body = {
          message: 'account_id is required',
        };
        await next();
      }

      const res = await transferBadgeService.IsBadgeAttained(
        query.account_id as string,
      );
      ctx.response.body = { result: res };
    } catch (error) {
      console.log(
        `something went wrong while fetching user's transfer badge eligibility`,
        error,
      );
      ctx.response.status = 500;
    }
    await next();
  });

  controllers.get('/v2/badge-stake', async (ctx, next) => {
    try {
      const { query } = ctx.request;
      if (query.account_id === undefined || query.account_id === null) {
        ctx.response.status = 400;
        ctx.response.body = {
          message: 'account_id is required',
        };
        await next();
      }

      const res = await stakeBadgeService.IsBadgeAttained(
        query.account_id as string,
      );
      ctx.response.body = { result: res };
    } catch (error) {
      console.log(
        `something went wrong while fetching user's stake badge eligibility`,
        error,
      );
      ctx.response.status = 500;
    }
    await next();
  });

  return controllers;
};
