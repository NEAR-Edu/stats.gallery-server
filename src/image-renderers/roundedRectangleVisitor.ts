import { CanvasVisitor, RoundedRectangleVisitorSpec } from "./CanvasVisitorSpec";

export default function (spec: RoundedRectangleVisitorSpec) {
  const { canvasContext, x, y, width, height, borderRadius } = spec;

  async function visit () {
    const right = x + width;
    const bottom = y + height;
  
    canvasContext.moveTo(x + borderRadius, y);
    canvasContext.lineTo(right - borderRadius, y);
    canvasContext.quadraticCurveTo(right, y, right, y + borderRadius);
    canvasContext.lineTo(right, bottom - borderRadius);
    canvasContext.quadraticCurveTo(right, bottom, right - borderRadius, bottom);
    canvasContext.lineTo(x + borderRadius, bottom);
    canvasContext.quadraticCurveTo(x, bottom, x, bottom - borderRadius);
    canvasContext.lineTo(x, y + borderRadius);
    canvasContext.quadraticCurveTo(x, y, x + borderRadius, y);

    return;
  }

  return Object.freeze({
    visit
  }) as CanvasVisitor
}
