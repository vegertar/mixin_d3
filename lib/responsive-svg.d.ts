import { ShadowElement } from "./shadow_element";

/**
 * `ResponsiveSvg` creates a responsive SVG element in ShadowDOM if and only if
 * both attributes `viewBox` and `size` are set. By default, the `viewBox` is
 * undefined, and `size` is determined by `resize` event handler automatically.
 */
export declare class ResponsiveSvg extends ShadowElement {
  readonly viewBox: [number, number, number, number] | undefined;
  readonly size: [number, number] | undefined;
}
