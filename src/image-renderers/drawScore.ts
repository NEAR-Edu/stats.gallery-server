import { NodeCanvasRenderingContext2D } from 'canvas';
import { drawRoundedRectangle } from './drawRoundedRectangle';

export const drawScore = (ctx: NodeCanvasRenderingContext2D, score: number) => {
  ctx.font = '700 60px "DM Sans"';
  ctx.fillStyle = 'rgb(109, 40, 217)';

  ctx.beginPath();
  const textSize = ctx.measureText(score.toString());
  const width = textSize.width + 2 * 40;

  drawRoundedRectangle(ctx, {
    x: 0,
    y: 0,
    width,
    height: 60 + 2 * 20,
    radius: 56,
  });
  ctx.fill();
  ctx.closePath();

  ctx.fillStyle = 'white';
  ctx.fillText(score.toString(), 40, 50 + 20);

  return width;
};
