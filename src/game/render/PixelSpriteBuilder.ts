// Pure pixel-art builder for procedural presentation sprites. Shapes are
// filled with named materials, then auto-shaded (top-left light,
// bottom-right shadow) and given a selective outline in each material's own
// outline color. The result is a list of horizontal color runs.

export type PixelMaterial = readonly [base: string, shadow: string, light: string, outline: string];
export type PixelPoint = readonly [number, number];
export type PixelRun = { readonly x: number; readonly y: number; readonly length: number; readonly color: string };
export type PixelSprite = { readonly width: number; readonly height: number; readonly runs: readonly PixelRun[] };

export function pixelRect(x0: number, y0: number, x1: number, y1: number): PixelPoint[] {
  const points: PixelPoint[] = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) points.push([x, y]);
  return points;
}

export function pixelEllipse(cx: number, cy: number, rx: number, ry: number): PixelPoint[] {
  return pixelRect(Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(cx + rx), Math.ceil(cy + ry))
    .filter(([x, y]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1);
}

export function pixelLine(from: PixelPoint, to: PixelPoint, width = 2): PixelPoint[] {
  const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])) || 1;
  const points: PixelPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(from[0] + ((to[0] - from[0]) * i) / steps);
    const y = Math.round(from[1] + ((to[1] - from[1]) * i) / steps);
    points.push(...pixelRect(x, y, x + width - 1, y));
  }
  return points;
}

export class PixelSpriteBuilder<M extends string> {
  private readonly material = new Map<number, M>();
  private readonly detail = new Map<number, string>();

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly materials: Record<M, PixelMaterial>,
  ) {}

  paint(points: readonly PixelPoint[], material: M): this {
    for (const [x, y] of points) {
      const key = this.key(x, y);
      if (key === null) continue;
      this.material.set(key, material);
      this.detail.delete(key);
    }
    return this;
  }

  /** Fixed-color detail pixels (eyes, teeth, lights) drawn over painted shapes. */
  dot(color: string, points: readonly PixelPoint[]): this {
    for (const [x, y] of points) {
      const key = this.key(x, y);
      if (key !== null) this.detail.set(key, color);
    }
    return this;
  }

  build(): PixelSprite {
    const at = (x: number, y: number) => (x < 0 || x >= this.width || y < 0 || y >= this.height ? undefined : this.material.get(y * this.width + x));
    const runs: PixelRun[] = [];
    for (let y = 0; y < this.height; y += 1) {
      let current: { x: number; length: number; color: string } | null = null;
      for (let x = 0; x <= this.width; x += 1) {
        const color = x < this.width ? this.colorAt(x, y, at) : undefined;
        if (current && color === current.color) {
          current.length += 1;
          continue;
        }
        if (current) runs.push({ x: current.x, y, length: current.length, color: current.color });
        current = color ? { x, length: 1, color } : null;
      }
    }
    return { width: this.width, height: this.height, runs };
  }

  private colorAt(x: number, y: number, at: (x: number, y: number) => M | undefined): string | undefined {
    const material = at(x, y);
    if (material) {
      const [base, shadow, light] = this.materials[material];
      let color = base;
      if (at(x + 1, y) !== material || at(x, y + 1) !== material) color = shadow;
      else if (at(x - 1, y) !== material && at(x, y - 1) !== material) color = light;
      return this.detail.get(y * this.width + x) ?? color;
    }
    const neighbor = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].find((value) => value !== undefined);
    return neighbor ? this.materials[neighbor][3] : undefined;
  }

  private key(x: number, y: number): number | null {
    return x < 0 || x >= this.width || y < 0 || y >= this.height ? null : y * this.width + x;
  }
}
