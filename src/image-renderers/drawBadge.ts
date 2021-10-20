import { Image, NodeCanvasRenderingContext2D } from 'canvas';

export const drawBadge = (
  ctx: NodeCanvasRenderingContext2D,
  image: Image,
) => {
  const DEFAULT_BADGE_SIZE = 80;

  ctx.drawImage(
    image,
    0,
    0,
    DEFAULT_BADGE_SIZE,
    (DEFAULT_BADGE_SIZE / image.width) * image.height,
  );

  return DEFAULT_BADGE_SIZE;
};
