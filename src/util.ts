import { createNoise2D } from "simplex-noise";

export interface MapTile {
  x: number;
  y: number;
  tileCoord: TileCoord;
}

interface TileCoord {
  index: number; // Unique index (row-major)
  x: number; // x in pixels
  y: number; // y in pixels
}

interface TilemapOptions {
  filePath: string;
  tileSize: number;
  padding?: number;
}

/**
 * Generates tile coordinates from a PNG tileset.
 */
export async function getTileCoordsFromTilemap({
  filePath,
  tileSize,
  padding = 0,
}: TilemapOptions): Promise<TileCoord[]> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = filePath;
    image.onload = () => {
      const tiles: TileCoord[] = [];

      const cols = Math.floor(image.width / (tileSize + padding));
      const rows = Math.floor(image.height / (tileSize + padding));

      let index = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          tiles.push({
            index: index++,
            x: x * (tileSize + padding),
            y: y * (tileSize + padding),
          });
        }
      }

      resolve(tiles);
    };

    image.onerror = (err) => reject(`Could not load image: ${filePath}`);
  });
}

/**
 * Generate a perlin map
 * @returns
 */
export function generatePerlinMap (tileCoords: TileCoord[], width: number, height: number) {
  if (tileCoords.length === 0) return [];
  const noise = createNoise2D();

  const newMap: MapTile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < width; x++) {
      const value = noise(x / 10, y / 10);

      // Pick a random tileCoord from the list
      const tileCoord = tileCoords[Math.floor(Math.random() * tileCoords.length)];

      row.push({ x, y, tileCoord });
    }
    newMap.push(row);
  }

  return newMap;
};
