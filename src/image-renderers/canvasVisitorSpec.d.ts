import { NodeCanvasRenderingContext2D } from "canvas";

export interface CanvasVisitorSpec {
  canvasContext:       NodeCanvasRenderingContext2D;
}

interface CanvasVisitor {
  visit(): Promise<number | undefined>;
}

export interface BadgeVisitorSpec extends CanvasVisitorSpec {
  path: string;
}

export interface LevelVisitorSpec extends CanvasVisitorSpec {
  level: number;
}

export interface RoundedRectangleVisitorSpec extends CanvasVisitorSpec {
  x:            number;
  y:            number;
  width:        number;
  height:       number;
  borderRadius: number;
}

export interface ScoreVisitorSpec extends CanvasVisitorSpec {
  score: number;
}
