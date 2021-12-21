import { Image, loadImage } from 'canvas';
import { QueryResultRow, TaggedTemplateLiteralInvocation } from 'slonik';
import badgeDeploySql from './queries/badge-deploy.sql';
import badgeNftSql from './queries/badge-nft.sql';
import badgeStakeSql from './queries/badge-stake.sql';
import badgeTransferSql from './queries/badge-transfer.sql';
import { Params } from './queries/Params';

export const badges: {
  image: Promise<Image>;
  call: (params: Params) => TaggedTemplateLiteralInvocation<QueryResultRow>;
}[] = [
  {
    image: loadImage(require('../assets/img/badge-nft.png')),
    call: badgeNftSql,
  },
  {
    image: loadImage(require('../assets/img/badge-transfer.png')),
    call: badgeTransferSql,
  },
  {
    image: loadImage(require('../assets/img/badge-stake.png')),
    call: badgeStakeSql,
  },
  {
    image: loadImage(require('../assets/img/badge-deploy.png')),
    call: badgeDeploySql,
  },
];
