import { loadImage } from "canvas";
import { LevelVisitorSpec, CanvasVisitor } from "./CanvasVisitorSpec";
import * as starImagePNG from "../../assets/img/star.png";

export default function (spec: LevelVisitorSpec) {
  const DEFAULT_LEVEL_SIZE = 100;

  const { canvasContext, level } = spec;

  async function visit() {
    const image = await loadImage(starImagePNG);

    canvasContext.drawImage(image, 0, 0, DEFAULT_LEVEL_SIZE, DEFAULT_LEVEL_SIZE);
  
    canvasContext.font = '700 60px "DM Sans"';
    canvasContext.fillStyle = 'white';
    const textSize = canvasContext.measureText(level.toString());
    canvasContext.fillText(level.toString(), 50 - textSize.width / 2, 50 + 20);
  
    return DEFAULT_LEVEL_SIZE;
  }

  return Object.freeze({
    visit
  }) as CanvasVisitor
}
