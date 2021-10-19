export interface CanvasVisitor {
  visit(): Promise<number>
}
