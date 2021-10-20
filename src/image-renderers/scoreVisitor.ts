import { CanvasVisitor, ScoreVisitorSpec } from "./CanvasVisitorSpec";

export default function (spec: ScoreVisitorSpec) {
  const { canvasContext, score } = spec;

  async function visit () {
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

  return Object.freeze({
    visit
  }) as CanvasVisitor
}
