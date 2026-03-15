/**
 * Determines whether a same-lane reposition is a no-op (drone stays in place).
 * Uses filtered-array indices where the dragged drone is excluded from midpoints.
 */
export function isRepositionNoOp(capturedInsertionIndex, currentIndex) {
  return capturedInsertionIndex == null || capturedInsertionIndex === currentIndex;
}
