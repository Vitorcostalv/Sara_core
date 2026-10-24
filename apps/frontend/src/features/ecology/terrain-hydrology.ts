/** Background moisture is not a visible river. Shared by water and ground geometry. */
export const RIVER_FLOW_MIN = 0.16;
export function hasVisibleRiver(flow: number | undefined) {
  return (flow ?? 0) > RIVER_FLOW_MIN;
}
