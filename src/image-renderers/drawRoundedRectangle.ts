import { NodeCanvasRenderingContext2D } from 'canvas';

export const drawRoundedRectangle = (
  ctx: NodeCanvasRenderingContext2D,
  {
    x,
    y,
    width,
    height,
    radius,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
  },
) => {
  const right = x + width;
  const bottom = y + height;

  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);

  return width;
};
