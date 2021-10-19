import { NodeCanvasRenderingContext2D } from "canvas";

export interface CanvasVisitorSpec {
  canvasContext: NodeCanvasRenderingContext2D;
  path?: string;
  level?: number;
  score?: number;
}
