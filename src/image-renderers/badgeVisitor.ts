import { loadImage } from "canvas";
import { CanvasVisitorSpec } from "./canvasVisitorSpec";

export default async function visit(spec: CanvasVisitorSpec) {
  const DEFAULT_BADGE_SIZE = 80;

  const { canvasContext, path } = spec;

  if (!path) {
    throw new Error('path is required in creating a badge graphic');
  }

  const image = await loadImage(path);

  canvasContext.drawImage(image, 0, 0, 80, (80 / image.width) * image.height);

  return DEFAULT_BADGE_SIZE;
}
