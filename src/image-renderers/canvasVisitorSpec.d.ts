import { NodeCanvasRenderingContext2D } from "canvas";

interface RectangleGraphic {
  x:            number;
  y:            number;
  width:        number;
  height:       number;
  borderRadius: number;
}

export interface CanvasVisitorSpec {
  canvasContext:       NodeCanvasRenderingContext2D;
  path?:               string;
  level?:              number;
  score?:              number;
  rectangleDimension?: RectangleGraphic;
}
