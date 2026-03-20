export const FAB_SIZE = 56;
export const FAB_EDGE_MARGIN = 20;
export const FAB_BOTTOM_MARGIN = 80;
export const FAB_DRAG_ACTIVE_OPACITY = 0.9;
export const FAB_IDLE_OPACITY = 1;
export const FAB_DRAG_THRESHOLD = 8;

export interface FabPosition {
  x: number;
  y: number;
}

export interface FabScreenSize {
  width: number;
  height: number;
}

export interface FabBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function getFabBounds(screen: FabScreenSize): FabBounds {
  return {
    minX: FAB_EDGE_MARGIN,
    maxX: Math.max(FAB_EDGE_MARGIN, screen.width - FAB_SIZE - FAB_EDGE_MARGIN),
    minY: FAB_EDGE_MARGIN,
    maxY: Math.max(FAB_EDGE_MARGIN, screen.height - FAB_SIZE - FAB_BOTTOM_MARGIN),
  };
}

export function clampFabPosition(position: FabPosition, screen: FabScreenSize): FabPosition {
  const bounds = getFabBounds(screen);

  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    y: clamp(position.y, bounds.minY, bounds.maxY),
  };
}

export function getDefaultFabPosition(screen: FabScreenSize): FabPosition {
  const bounds = getFabBounds(screen);

  return {
    x: bounds.maxX,
    y: bounds.maxY,
  };
}

export function snapFabPosition(position: FabPosition, screen: FabScreenSize): FabPosition {
  const bounds = getFabBounds(screen);
  const clamped = clampFabPosition(position, screen);
  const midpoint = (bounds.minX + bounds.maxX) / 2;

  return {
    x: clamped.x <= midpoint ? bounds.minX : bounds.maxX,
    y: clamped.y,
  };
}

export function hasExceededDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > FAB_DRAG_THRESHOLD;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
