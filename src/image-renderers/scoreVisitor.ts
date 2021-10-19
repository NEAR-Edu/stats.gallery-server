import { CanvasVisitorSpec } from "./canvasVisitorSpec";
import { NodeCanvasRenderingContext2D } from "canvas";

export default function ScoreVisitor(spec: CanvasVisitorSpec) {

  const { canvasContext, score } = spec;

  function roundedRectangleVisitor(canvasContext: NodeCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    var right = x + width,
      bottom = y + height;
  
    canvasContext.moveTo(x + radius, y);
    canvasContext.lineTo(right - radius, y);
    canvasContext.quadraticCurveTo(right, y, right, y + radius);
    canvasContext.lineTo(right, bottom - radius);
    canvasContext.quadraticCurveTo(right, bottom, right - radius, bottom);
    canvasContext.lineTo(x + radius, bottom);
    canvasContext.quadraticCurveTo(x, bottom, x, bottom - radius);
    canvasContext.lineTo(x, y + radius);
    canvasContext.quadraticCurveTo(x, y, x + radius, y);
  }
  
  function visit() {
    if (!score) {
      throw new Error('score property is required in creating score graphics');
    }
  
    canvasContext.font = '700 60px "DM Sans"';
    canvasContext.fillStyle = 'rgb(109, 40, 217)';
    canvasContext.beginPath();
    const textSize = canvasContext.measureText(score.toString());
    roundedRectangleVisitor(canvasContext, 0, 0, textSize.width + 2 * 40, 60 + 2 * 20, 56);
    canvasContext.fill();
    canvasContext.closePath();
  
    canvasContext.fillStyle = 'white';
    canvasContext.fillText(score.toString(), 40, 50 + 20);
  
    const scoreSizeInPixels = textSize.width + 2 * 40;
  
    return scoreSizeInPixels;
  }


}