import { CanvasVisitorSpec } from "./canvasVisitorSpec";

export default function visit(spec: CanvasVisitorSpec) {
  const { canvasContext, rectangleDimension } = spec;
  
  if (!rectangleDimension) {
    throw new Error('rectangleDimension is required in creating a rectangle graphic');
  }

  const { x, y, width, height, borderRadius } = rectangleDimension;

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
}