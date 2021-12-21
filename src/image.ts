import { createCanvas, loadImage, registerFont } from 'canvas';
import { DatabasePool } from 'slonik';
import { badges } from './badges';
import { drawBadge } from './image-renderers/drawBadge';
import { drawLevel } from './image-renderers/drawLevel';
import { drawScore } from './image-renderers/drawScore';
import scoreSql from './queries/score-from-cache.sql';
import { clipString } from './utils/clipString';
import { humanizeLevel } from './utils/humanize';
import { currentLevel } from './utils/level';

registerFont(require('../assets/fonts/DMSans-Regular.ttf'), {
  family: 'DM Sans',
  weight: '400',
});

registerFont(require('../assets/fonts/DMSans-Bold.ttf'), {
  family: 'DM Sans',
  weight: '700',
});

registerFont(require('../assets/fonts/Rubik-Bold.ttf'), {
  family: 'Rubik',
  weight: '700',
});

const iconPromise = loadImage(require('../assets/img/icon.png'));
const logoPromise = loadImage(require('../assets/img/logo.png'));

export async function draw(
  accountName: string,
  pool: DatabasePool,
  cachePool: DatabasePool,
) {
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const scorePromise = cachePool.one(scoreSql({ account_id: accountName }));

  const hasPromise = Promise.all(
    badges.map(async badge => {
      const { result } = await pool.one(
        badge.call({ account_id: accountName }),
      );
      return result !== null && result > 0;
    }),
  );

  // ctx.fillStyle = '#f1f5f9';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  const xRule = 80;
  let yRule = 180;

  ctx.fillStyle = 'rgb(51, 65, 85)';
  let size = 100,
    clip = false;
  while (true) {
    ctx.font = `700 ${size}px "Rubik"`;
    const accountNameTextSize = ctx.measureText(accountName);
    if (accountNameTextSize.width + xRule < 910) {
      break;
    } else if (size <= 60) {
      clip = true;
      break;
    } else {
      size -= 10;
    }
  }

  if (clip) {
    ctx.fillText(clipString(accountName, 23, 2), xRule, yRule);
  } else {
    ctx.fillText(accountName, xRule, yRule);
  }

  yRule += 68;

  ctx.save();
  ctx.font = '700 33px "DM Sans"';
  ctx.fillStyle = '#999';
  ctx.fillText('Level', xRule, yRule - 15);
  ctx.fillText('Score', xRule + 120, yRule - 15);
  ctx.restore();

  ctx.save();
  ctx.translate(xRule, yRule);
  const { result: rawScore } = await scorePromise;
  const score = rawScore !== null && rawScore === +rawScore ? rawScore : 0;
  const levelWidth = await drawLevel(ctx, currentLevel(score).level);
  ctx.restore();

  ctx.save();
  ctx.translate(xRule + levelWidth + 20, yRule);
  // const scoreWidth =
  drawScore(ctx, score);
  ctx.restore();

  yRule += 156;

  ctx.save();
  ctx.font = '700 33px "DM Sans"';
  ctx.fillStyle = '#999';
  ctx.fillText('Badges', xRule, yRule - 15);
  ctx.restore();

  ctx.save();
  ctx.translate(xRule, yRule);
  const has = await hasPromise;
  const hasBadges = badges.filter((_, i) => has[i]);
  for (let badge of hasBadges) {
    const w = await drawBadge(ctx, await badge.image);
    ctx.translate(w + w / 6, 0);
  }
  ctx.restore();

  ctx.fillStyle = '#aaa';
  ctx.font = '400 45px "DM Sans"';
  ctx.fillText('NEAR Account Statistics', 60, 60);

  ctx.save();
  ctx.fillStyle = '#bcd';
  ctx.font = '700 65px "DM Sans"';
  const rank = humanizeLevel(currentLevel(score).level);
  const rankTextSize = ctx.measureText(rank);
  ctx.translate(width - 60 - rankTextSize.width, height - 100);
  ctx.fillText(rank, 0, 0);
  ctx.restore();

  const icon = await iconPromise;
  const iconWidth = 200;
  const iconHeight = (iconWidth / icon.width) * icon.height;
  ctx.drawImage(icon, width - iconWidth - 70, 80, iconWidth, iconHeight);

  const logo = await logoPromise;
  const logoWidth = 400;
  const logoHeight = (logoWidth / logo.width) * logo.height;
  ctx.drawImage(
    logo,
    width - logoWidth - 60,
    height - logoHeight - 10,
    logoWidth,
    logoHeight,
  );

  return canvas;
}
