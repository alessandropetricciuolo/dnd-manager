export type { NormPoint } from "./types";
export { pointInPolygon } from "./point-in-polygon";
export { parsePolygonJson } from "./parse-polygon";
export { clampNormPoint } from "./clamp";
export {
  type ClientPointToNormInput,
  type ClientPointToRectNormInput,
  type ContainedElementSize,
  type ObjectContainLayout,
  clientPointToRectNorm,
  clientPointToNorm,
  elementPxToNorm,
  getContainedElementSize,
  getObjectContainLayout,
  intrinsicNormToElementPx,
  intrinsicNormToSvgUserUnits,
  normToCssPercentPosition,
} from "./object-contain";
