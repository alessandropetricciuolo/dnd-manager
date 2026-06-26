export { FOG_FILL_GM, FOG_FILL_PROJECTION, fogFillForMode } from "./constants";
export {
  drawFogOnCanvas,
  getDevicePixelRatio,
  sizeCanvasToElement,
  tracePolygonPathPx,
  type DrawFogOptions,
} from "./draw-fog";
export {
  planSceneFowRegionSync,
  revealedBySourceAreaId,
  type ExistingFowRegion,
  type FowRegionSyncPlan,
  type FowRegionUpsert,
} from "./fow-sync";
