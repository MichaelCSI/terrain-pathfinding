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
// Helper function to convert Point2D to string
const point2DToString = (p: Point2D) => `${p.x},${p.y}`;


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
    connectedPOIs: Set<number>;
    disconnectedPOIs: number[];
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
 * @param grid The 2D array of MapTiles
 * @param start The starting tile coordinates { x, y }
 * @param end The ending tile coordinates { x, y }
 * @param bridgeSteps (Optional) Number of unwalkable tiles allowed to "bridge" across. Default = 0
 * @returns An array of points representing the path or null if no path is found
 */
 export function findPathAStar(
    grid: MapTile[][],
    start: Point2D,
    end: Point2D,
    bridgeSteps: number = 0,
    bridgeCost: number = 0
): Point2D[] | null {
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

    // While some neighbors are unexplored, select node with lowest total cost
    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift()!;

        // Check if we reached our goal
        if (current.x === end.x && current.y === end.y) {
            const path = [];
            let node: NodeAStar | undefined = current;
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }

        // If not, mark node as visited (track bridge state)
        closedSet.add(`${current.x},${current.y},${current.bridgesUsed}`);

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

            // Already explored this neighbor node
            const stateKey = `${x},${y},${nextBridgesUsed}`;
            if (closedSet.has(stateKey)) continue;

            // If a tile is not walkable and we have to build a bridge, adjust the cost
            const stepCost = isWalkable ? 1 : bridgeCost;
            const g = current.g + stepCost;
            const h = manhatten(x, end.x, y, end.y);
            const f = g + h;

            // Add neighbor to the open set if necessary, if it's already they, compare path cost
            const existing = openSet.find(
                (n) => n.x === x && n.y === y && n.bridgesUsed === nextBridgesUsed
            );
            if (existing) {
                if (g < existing.g) {
                    existing.g = g;
                    existing.f = f;
                    existing.parent = current;
                }
            } else {
                openSet.push({ x, y, g, h, f, parent: current, bridgesUsed: nextBridgesUsed });
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
        return { paths: [], connectedPOIs: new Set(), disconnectedPOIs: [] };
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
        if (!inMST.has(i)) disconnected.push(i);
    }

    return {
        paths: mstEdges.map((e) => e.path),
        connectedPOIs: inMST,
        disconnectedPOIs: disconnected,
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
