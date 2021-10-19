import { CanvasVisitorSpec } from "./canvasVisitorSpec";

export default function visit(spec: CanvasVisitorSpec) {

  const { canvasContext, score } = spec;

  if (!score) {
    throw new Error('score property is required in creating score graphics');
  }

  canvasContext.font = '700 60px "DM Sans"';
  canvasContext.fillStyle = 'rgb(109, 40, 217)';
  canvasContext.beginPath();
  const textSize = canvasContext.measureText(score.toString());
  canvasContext.fill();
  canvasContext.closePath();

  canvasContext.fillStyle = 'white';
  canvasContext.fillText(score.toString(), 40, 50 + 20);

  const scoreSizeInPixels = textSize.width + 2 * 40;

  return scoreSizeInPixels;


}