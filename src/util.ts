import { createNoise2D } from "simplex-noise";

export interface MapTile {
    x: number;
    y: number;
    tileCoord: TileCoord;
    tileType: TileType;
    walkable?: boolean; // Walkable according to pathfinding
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

// Node in pathfinding
type Node = {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent?: Node;
};


/**
 * Manhattan distance between two points for pathfinding in a grid
 * 
 * @param x1 - X coordinate of the current node
 * @param x2 - X coordinate of the target node
 * @param y1 - Y coordinate of the current node
 * @param y2 - Y coordinate of the target node
 * @returns The Manhattan distance
 */
function heuristic(x1: number, x2: number, y1: number, y2: number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Finds the shortest walkable path between two points on a 2D grid using the A* algorithm
 * 
 * @param grid - The 2D array of MapTiles
 * @param start - The starting tile coordinates { x, y }
 * @param end - The ending tile coordinates { x, y }
 * @returns An array of coordinates representing the path or null if no path is found
 */
export function findPath(
    grid: MapTile[][],
    start: { x: number; y: number },
    end: { x: number; y: number }
): { x: number; y: number }[] | null {
    const openSet: Node[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: Node = {
        x: start.x,
        y: start.y,
        g: 0,
        h: heuristic(start.x, end.x, start.y, end.y),
        f: 0,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
        // Find node with lowest f
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift()!;
        if (current.x === end.x && current.y === end.y) {
            // Reconstruct path
            const path = [];
            let node: Node | undefined = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }

        closedSet.add(`${current.x},${current.y}`);

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];

        for (const { x, y } of neighbors) {
            if (
                x < 0 || x >= grid[0].length ||
                y < 0 || y >= grid.length ||
                closedSet.has(`${x},${y}`) ||
                !grid[y][x].walkable
            ) {
                continue;
            }

            const g = current.g + 1;
            const h = heuristic(x, end.x, y, end.y)
            const f = g + h;

            const existing = openSet.find((n) => n.x === x && n.y === y);
            if (existing) {
                if (g < existing.g) {
                    existing.g = g;
                    existing.f = f;
                    existing.parent = current;
                }
            } else {
                openSet.push({ x, y, g, h, f, parent: current });
            }
        }
    }

    return null;
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
            const walkable = tileType === "Water" ? false: true;

            // Pick a tile based on the tile type
            const tileCoord = tileCoords[assignTileIndex(tileType)];

            row.push({ x, y, tileCoord, tileType, walkable });
        }
        newMap.push(row);
    }

    return newMap;
}

/**
 * Assign tile types based on noise value
 * @param noiseValue Value in noise map at a given coordinate
 * @returns A tile type that corresponds to a tileset
 */
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

/**
 * Assign a tile from the tilemap arbitrarily (handpicked tiles from tilemaps)
 * @param tileType The type of tilemap
 * @returns Index to a specific tile
 */
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

/**
 * Assign a color representing different noise values of noise map based on tile type
 * @param tileType The type of tilemap
 * @returns A tile color
 */
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
