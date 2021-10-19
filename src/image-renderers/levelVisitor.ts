import { loadImage } from "canvas";
import { CanvasVisitorSpec } from "./canvasVisitorSpec";

export async function visit(spec: CanvasVisitorSpec) {
  const DEFAULT_LEVEL_SIZE = 100;

  const { canvasContext, level } = spec;

  if (!level) {
    throw new Error('level is required in creating level graphic');
  }

  const image = await loadImage(require('../assets/img/star.png'));

  canvasContext.drawImage(image, 0, 0, 100, 100);

  canvasContext.font = '700 60px "DM Sans"';
  canvasContext.fillStyle = 'white';
  const textSize = canvasContext.measureText(level.toString());
  canvasContext.fillText(level.toString(), 50 - textSize.width / 2, 50 + 20);

  return DEFAULT_LEVEL_SIZE;
}
