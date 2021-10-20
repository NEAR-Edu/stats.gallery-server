const { createCanvas, loadImage, registerFont } = require('canvas');
const clipString = require('./utils/clipString');
const badgeDeploySql = require('./queries/badge-deploy.sql');
const badgeNftSql = require('./queries/badge-nft.sql');
const badgeStakeSql = require('./queries/badge-stake.sql');
const badgeTransferSql = require('./queries/badge-transfer.sql');
const scoreSql = require('./queries/score-from-cache.sql');
const { currentLevel } = require('./utils/level');
const { humanizeLevel } = require('./utils/humanize');

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

function roundedRect(ctx, x, y, width, height, radius) {
  var right = x + width,
    bottom = y + height;

  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function drawScore(ctx, score) {
  ctx.font = '700 60px "DM Sans"';
  ctx.fillStyle = 'rgb(109, 40, 217)';
  ctx.beginPath();
  const textSize = ctx.measureText(score);
  roundedRect(ctx, 0, 0, textSize.width + 2 * 40, 60 + 2 * 20, 56);
  ctx.fill();
  ctx.closePath();

  ctx.fillStyle = 'white';
  ctx.fillText(score, 40, 50 + 20);

  return textSize.width + 2 * 40;
}

async function drawLevel(ctx, level) {
  // const image = await loadImage(__dirname + '/img/star.png');
  const image = await loadImage(require('../assets/img/star.png'));

  ctx.drawImage(image, 0, 0, 100, 100);

  ctx.font = '700 60px "DM Sans"';
  ctx.fillStyle = 'white';
  const textSize = ctx.measureText(level);
  ctx.fillText(level, 50 - textSize.width / 2, 50 + 20);

  return 100;
}

async function drawBadge(ctx, path) {
  const image = await loadImage(path);

  ctx.drawImage(image, 0, 0, 80, (80 / image.width) * image.height);

  return 80;
}

const badges = [
  {
    path: require('../assets/img/badge-nft.png'),
    call: badgeNftSql,
  },
  {
    path: require('../assets/img/badge-transfer.png'),
    call: badgeTransferSql,
  },
  {
    path: require('../assets/img/badge-stake.png'),
    call: badgeStakeSql,
  },
  {
    path: require('../assets/img/badge-deploy.png'),
    call: badgeDeploySql,
  },
];

async function draw(accountName, pool, cachePool) {
  const width = 1200;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const scorePromise = cachePool.one(scoreSql({ account_id: accountName }));

  const hasPromise = Promise.all(
    badges.map(async (badge) => {
      const { result } = await pool.one(
        badge.call({ account_id: accountName }),
      );
      return result > 0;
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
  const { result: score } = await scorePromise;
  const levelWidth = await drawLevel(ctx, currentLevel(score).level);
  ctx.restore();

  ctx.save();
  ctx.translate(xRule + levelWidth + 20, yRule);
  const scoreWidth = drawScore(ctx, score ?? '0');
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
  for (badge of hasBadges) {
    const w = await drawBadge(ctx, badge.path);
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

  const icon = await loadImage(require('../assets/img/icon.png'));
  const iconWidth = 200;
  const iconHeight = (iconWidth / icon.width) * icon.height;
  ctx.drawImage(icon, width - iconWidth - 70, 80, iconWidth, iconHeight);

  const logo = await loadImage(require('../assets/img/logo.png'));
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

module.exports = draw;
