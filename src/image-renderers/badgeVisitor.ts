import { loadImage } from "canvas";
import { BadgeVisitorSpec, CanvasVisitor } from "./CanvasVisitorSpec";

export default function (spec: BadgeVisitorSpec) {

  const { canvasContext, path } = spec;
  
  const DEFAULT_BADGE_SIZE = 80;

  async function visit() {
    const image = await loadImage(path);
  
    canvasContext.drawImage(image, 0, 0, DEFAULT_BADGE_SIZE, (DEFAULT_BADGE_SIZE / image.width) * image.height);
  
    return DEFAULT_BADGE_SIZE;
  }

  return Object.freeze({
    visit
  }) as CanvasVisitor
}
