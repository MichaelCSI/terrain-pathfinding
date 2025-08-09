import { createNoise2D } from "simplex-noise";

export interface MapTile {
    gridCoordinates: Point2D;
    tileType?: TileType;
    walkable?: boolean;
}

export interface Point2D {
    x: number,
    y: number
}

type TileType = "Stone" | "Grass" | "Water";


// Node in pathfinding
type Node = {
    x: number;
    y: number;
    g: number; // Cost from starting node to current node
    h: number; // Estimated cost from current node to end node (e.g. manhatten)
    f: number; // Total estimated cost of path through current node f = g + h
    parent?: Node;
};


/**
 * Manhattan distance between two points for pathfinding in a grid.
 * Used as the heuristic for the A* pathfinding (2D grid pathing).
 * 
 * @param x1 - X coordinate of the current node
 * @param x2 - X coordinate of the target node
 * @param y1 - Y coordinate of the current node
 * @param y2 - Y coordinate of the target node
 * @returns The Manhattan distance
 */
function manhatten(x1: number, x2: number, y1: number, y2: number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Finds the shortest walkable path between two points on a 2D grid using the A* algorithm
 * 
 * @param grid - The 2D array of MapTiles
 * @param start - The starting tile coordinates { x, y }
 * @param end - The ending tile coordinates { x, y }
 * @returns An array of points representing the path or null if no path is found
 */
export function findPathAStar(grid: MapTile[][], start: Point2D, end: Point2D): Point2D[] | null {
    const openSet: Node[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: Node = {
        x: start.x,
        y: start.y,
        g: 0,
        h: manhatten(start.x, end.x, start.y, end.y),
        f: 0,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
        // Select node with lowest total cost (f = g + h) from unexplored nodes
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift()!;

        // We found the end: trace parent links to reconstruct path, return path
        if (current.x === end.x && current.y === end.y) {
            const path = [];
            let node: Node | undefined = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }

        // Node as been explored, add it to the closed set
        closedSet.add(`${current.x},${current.y}`);

        // Explore 4-directional grid neighbors (up, down, left, right)
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];
        for (const { x, y } of neighbors) {
            // Skip out-of-bounds, visited, or non-walkable tiles
            if (
                x < 0 || x >= grid[0].length ||
                y < 0 || y >= grid.length ||
                closedSet.has(`${x},${y}`) ||
                !grid[y][x].walkable
            ) {
                continue;
            }

            const g = current.g + 1;
            const h = manhatten(x, end.x, y, end.y)
            const f = g + h;

            // If a node is already in the open set, update it if this path is better
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
 * Generate a perlin map
 * @returns A MapTile grid based on the perlin map
 */
export function generatePerlinMap(
    width: number,
    height: number
): MapTile[][] {
    const noise = createNoise2D();

    const newMap: MapTile[][] = [];

    for (let y = 0; y < height; y++) {
        const row: MapTile[] = [];
        for (let x = 0; x < width; x++) {

            // Assign a type to the tile based on the perlin value
            const value = noise(x / 10, y / 10);
            const tileType = assignTileType(value);
            const walkable = tileType === "Grass";

            // Pick a tile based on the tile type
            const gridCoordinates = { x, y }

            row.push({ gridCoordinates, tileType, walkable });
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
    if (noiseValue < 0) {
        return "Water";
    } else if (noiseValue < 0.8) {
        return "Grass";
    } else {
        return "Stone";
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
        case "Stone":
            return "#9e9d9c";
        default:
            throw new Error(`Unknown tile type: ${tileType}`);
    }
}
