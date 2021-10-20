import { loadImage, NodeCanvasRenderingContext2D } from 'canvas';
import starImagePNG from '../../assets/img/star.png';

const DEFAULT_LEVEL_SIZE = 100;
const image = loadImage(starImagePNG);

export const drawLevel = async (
  ctx: NodeCanvasRenderingContext2D,
  level: number,
) => {
  ctx.drawImage(await image, 0, 0, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE);

  ctx.font = '700 60px "DM Sans"';
  ctx.fillStyle = 'white';
  const textSize = ctx.measureText(level.toString());
  ctx.fillText(level.toString(), 50 - textSize.width / 2, 50 + 20);

  return DEFAULT_LEVEL_SIZE;
};
