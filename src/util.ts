import { createNoise2D } from "simplex-noise";
import seedrandom from "seedrandom";

export interface MapTile {
    x: number;
    y: number;
    tileCoord: TileCoord;
    tileType: TileType;
}

type TileType = "Hills" | "Trees" | "Grass" | "Water";

interface TileCoord {
    index: number; // Unique index (row-major)
    x: number; // x in pixels
    y: number; // y in pixels
    tileX: number; // column (tile grid)
    tileY: number; // row (tile grid)
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
                        tileX: x,
                        tileY: y,
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
export function generatePerlinMap(
    tileCoords: TileCoord[],
    width: number,
    height: number
) {
    if (tileCoords.length === 0) return [];

    const noise = createNoise2D();

    const newMap: MapTile[][] = [];

    for (let y = 0; y < height; y++) {
        const row: MapTile[] = [];
        for (let x = 0; x < width; x++) {

            // Assign a type to the tile based on the perlin value
            const value = noise(x / 10, y / 10);
            const tileType = assignTileType(value);

            // Pick a tile based on the tile type
            const tileCoord = tileCoords[assignTileIndex(tileType)];

            row.push({ x, y, tileCoord, tileType });
        }
        newMap.push(row);
    }

    return newMap;
}

function assignTileType(noiseValue: number): TileType {
    if (noiseValue < -0.5) {
        return "Water";
    } else if (noiseValue < 0.0) {
        return "Grass";
    } else if (noiseValue < 0.5) {
        return "Hills";
    } else {
        return "Trees";
    }
}

function assignTileIndex(tileType: TileType): number {
    switch (tileType) {
        case "Water":
            return 0;
        case "Grass":
            return 5;
        case "Hills":
            return 1;
        case "Trees":
            return 15;
        default:
            throw new Error(`Unknown tile type: ${tileType}`);
    }
}

export function assignTilePerlinOverlay(tileType: TileType): string {
    switch (tileType) {
        case "Water":
            return "#0000a5";
        case "Grass":
            return "#00a500";
        case "Hills":
            return "#808080";
        case "Trees":
            return "#964b00";
        default:
            throw new Error(`Unknown tile type: ${tileType}`);
    }
}
