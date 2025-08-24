import { createNoise2D } from "simplex-noise";
import { MinHeap } from "./util";

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


// Node in A* pathfinding
type NodeAStar = {
    x: number;
    y: number;
    g: number; // Cost from starting node to current node
    h: number; // Estimated cost from current node to end node (e.g. manhatten)
    f: number; // Total estimated cost of path through current node f = g + h
    parent?: NodeAStar;
    bridgesUsed: number; // Allow bridging to unreachable nodes if they are within this value
};

// Edge for MST
interface Edge {
    from: number;
    to: number;
    cost: number;
    path: Point2D[];
}

// MST result with MST info
interface MSTResult {
    paths: Point2D[][];
    connectedPoints: Point2D[];
    disconnectedPoints: Point2D[];
}

// Noise layer that defines the layers noise function, noise map scale, and factor (influence)
export type NoiseLayer = {
    noise: (x: number, y: number, t?: number) => number;
    scale: number;
    factor: number;
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
 * Finds the shortest path between two points on a 2D grid using the A* algorithm,
 * with optional "bridge" steps to traverse a limited number of unwalkable tiles.
 *
 * Optimizations:
 * - Uses a binary heap (priority queue) instead of repeatedly sorting openSet.
 * - Tracks nodes in a hash map keyed by (x,y,bridgesUsed) for O(1) lookup.
 *
 * @param grid The 2D array of MapTiles
 * @param start The starting tile coordinates { x, y }
 * @param end The ending tile coordinates { x, y }
 * @param bridgeSteps (Optional) Number of unwalkable tiles allowed to "bridge" across. Default = 0
 * @param bridgeCost (Optional) Cost multiplier for bridging across an unwalkable tile. Default = 0
 * @returns An array of points representing the path or null if no path is found
 */
 export function findPathAStar(
    grid: MapTile[][],
    start: Point2D,
    end: Point2D,
    bridgeSteps: number = 0,
    bridgeCost: number = 0
): Point2D[] | null {
    // Map of known nodes (x,y,bridgesUsed) --> Node
    const nodeMap = new Map<string, NodeAStar>();
    const closedSet: Set<string> = new Set();

    // Helper to generate unique key for node map
    const makeKey = (x: number, y: number, b: number) => `${x},${y},${b}`;

    // Initial values
    const heuristic = manhatten(start.x, end.x, start.y, end.y);
    const startNode: NodeAStar = {x: start.x, y: start.y, g: 0, h: heuristic, f: heuristic, bridgesUsed: 0};

    // Keep new nodes in a min heap (node, path cost) for quick access
    const openSet = new MinHeap<NodeAStar>();
    openSet.push(startNode, startNode.f);
    nodeMap.set(makeKey(startNode.x, startNode.y, 0), startNode);

    // While some neighbors are unexplored, select node with lowest total cost
    while (!openSet.isEmpty()) {
        const current = openSet.pop()!;
        const currentKey = makeKey(current.x, current.y, current.bridgesUsed);

        // If already closed, skip
        if (closedSet.has(currentKey)) continue;
        closedSet.add(currentKey);

        // Goal reached
        if (current.x === end.x && current.y === end.y) {
            const path: Point2D[] = [];
            let node: NodeAStar | undefined = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }

        // Explore neighbors (grid, 4 directions)
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
        ];

        for (const { x, y } of neighbors) {
            if (x < 0 || x >= grid[0].length || y < 0 || y >= grid.length) continue;

            const isWalkable = grid[y][x].walkable;
            const nextBridgesUsed = isWalkable ? current.bridgesUsed : current.bridgesUsed + 1;

            // Skip if over bridge allowance
            if (nextBridgesUsed > bridgeSteps) continue;

            const neighborKey = makeKey(x, y, nextBridgesUsed);
            if (closedSet.has(neighborKey)) continue;

            // If a tile is not walkable and we have to build a bridge, adjust the cost
            const stepCost = isWalkable ? 1 : bridgeCost;
            const g = current.g + stepCost;
            const h = manhatten(x, end.x, y, end.y);
            const f = g + h;

            const existing = nodeMap.get(neighborKey);
            if (!existing || g < existing.g) {
                const neighborNode: NodeAStar = {x, y, g, h, f, parent: current, bridgesUsed: nextBridgesUsed};
                nodeMap.set(neighborKey, neighborNode);
                openSet.push(neighborNode, f);
            }
        }
    }

    return null;
}




/**
 * Generator version of A* pathfinding function with optional bridging through unwalkable tiles.
 * Yields the search state at each step for visualization
 * 
 * @param grid The 2D array of MapTiles
 * @param start The starting tile coordinates { x, y }
 * @param end The ending tile coordinates { x, y }
 * @param bridgeSteps (Optional) Number of unwalkable tiles allowed to "bridge" across. Default = 0
 */
 export function* findPathAStarGenerator(
    grid: MapTile[][],
    start: Point2D,
    end: Point2D,
    bridgeSteps: number = 0,
    bridgeCost: number = 0
) {
    const openSet: NodeAStar[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: NodeAStar = {
        x: start.x,
        y: start.y,
        g: 0,
        h: manhatten(start.x, end.x, start.y, end.y),
        f: 0,
        bridgesUsed: 0,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const currentNode = openSet.shift()!;

        // Yield the current search state
        yield {
            currentNode,
            openSet: [...openSet],
            closedSet: new Set(closedSet),
            finalPath: [],
        };

        // Goal reached
        if (currentNode.x === end.x && currentNode.y === end.y) {
            const path = [];
            let node: NodeAStar | undefined = currentNode;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            // Yield final result
            yield {
                currentNode,
                openSet: [...openSet],
                closedSet: new Set(closedSet),
                finalPath: path,
            };
            return;
        }

        closedSet.add(`${currentNode.x},${currentNode.y},${currentNode.bridgesUsed}`);

        // Neighbors (4-way)
        const neighbors = [
            { x: currentNode.x + 1, y: currentNode.y },
            { x: currentNode.x - 1, y: currentNode.y },
            { x: currentNode.x, y: currentNode.y + 1 },
            { x: currentNode.x, y: currentNode.y - 1 },
        ];

        for (const { x, y } of neighbors) {
            if (x < 0 || x >= grid[0].length || y < 0 || y >= grid.length) continue;

            const isWalkable = grid[y][x].walkable;
            const stepCost = isWalkable ? 1 : bridgeCost;
            const nextBridgesUsed = isWalkable ? currentNode.bridgesUsed : currentNode.bridgesUsed + 1;

            // Too many bridges? skip
            if (nextBridgesUsed > bridgeSteps) continue;

            const stateKey = `${x},${y},${nextBridgesUsed}`;
            if (closedSet.has(stateKey)) continue;

            const g = currentNode.g + stepCost;
            const h = manhatten(x, end.x, y, end.y);
            const f = g + h;

            const existing = openSet.find(
                (n) => n.x === x && n.y === y && n.bridgesUsed === nextBridgesUsed
            );
            if (existing) {
                if (g < existing.g) {
                    existing.g = g;
                    existing.f = f;
                    existing.parent = currentNode;
                }
            } else {
                openSet.push({
                    x,
                    y,
                    g,
                    h,
                    f,
                    parent: currentNode,
                    bridgesUsed: nextBridgesUsed,
                });
            }
        }
    }
    return null;
}



/**
 * Compute an MST using prim and A*
 * @param map Grid / Graph
 * @param points Points to connect
 * @returns MST
 */
export function findMST(
    map: MapTile[][],
    points: Point2D[],
    bridgeAllowance: number = 0,
    bridgeCost: number = 1
): MSTResult {
    if (points.length < 2) {
        return { paths: [], connectedPoints: [], disconnectedPoints: [] };
    }
    const numPoints = points.length;
    const edges: Edge[] = [];

    // Precompute pairwise shortest paths with A*
    for (let i = 0; i < numPoints; i++) {
        for (let j = i + 1; j < numPoints; j++) {
            const path = findPathAStar(map, points[i], points[j], bridgeAllowance, bridgeCost);
            if (path) {
                edges.push({ from: i, to: j, cost: path.length, path });
            }
        }
    }

    // Prim's MST
    const inMST = new Set<number>();
    const mstEdges: Edge[] = [];
    inMST.add(0); // start with first POI

    // Pick smallest edge that connects MST to a new node until we have all points
    while (inMST.size < numPoints) {
        let bestEdge: Edge | null = null;
        for (const e of edges) {
            if (inMST.has(e.from) && !inMST.has(e.to)) {
                if (!bestEdge || e.cost < bestEdge.cost) bestEdge = e;
            } else if (inMST.has(e.to) && !inMST.has(e.from)) {
                if (!bestEdge || e.cost < bestEdge.cost) bestEdge = e;
            }
        }
        if (!bestEdge) break;

        mstEdges.push(bestEdge);
        inMST.add(bestEdge.from);
        inMST.add(bestEdge.to);
    }

    // Track disconnected points
    const disconnected = [];
    for (let i = 0; i < numPoints; i++) {
        if (!inMST.has(i)) disconnected.push(points[i]);
    }

    const connected = Array.from(inMST, i => points[i]);

    return {
        paths: mstEdges.map((e) => e.path),
        connectedPoints: connected,
        disconnectedPoints: disconnected,
    };
}



/**
 * Helper function to make ridged perlin noise
 * @returns Noise function for ridged perlin noise
 */
export function ridgedPerlinNoise2D(invert: boolean = false, smoothingExponent: number = 1) {
    const noise = createNoise2D();
    return (x: number, y: number) => {
        let value = 1 - Math.abs(noise(x, y));
        value = invert ? - value : value;
        value = Math.pow(value, smoothingExponent);
        return value;
    }
};

/**
 * Generate a perlin map
 * @param width Width of the map
 * @param height Height of the map
 * @param layers Noise layers used in the map
 * @returns A MapTile grid based on the perlin map
 */
export function generatePerlinMap(
    width: number,
    height: number,
    layers: NoiseLayer[],
    waterThreshold: number,
    grassThreshold: number
): MapTile[][] {
    const newMap: MapTile[][] = [];

    for (let y = 0; y < height; y++) {
        const row: MapTile[] = [];
        for (let x = 0; x < width; x++) {

            // Accumulate noise value from values in each layer
            const value = layers.reduce((acc, layer) => {
                const v = layer.noise(x / layer.scale, y / layer.scale);
                return acc + v * layer.factor;
            }, 0);

            // Assign tile type (e.g. water) based on the noise value
            let tileType: TileType;
            if (value < waterThreshold) {
                tileType = "Water";
            } else if (value < grassThreshold) {
                tileType = "Grass";
            } else {
                tileType = "Stone";
            }

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
