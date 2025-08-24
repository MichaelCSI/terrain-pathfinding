import { useEffect, useState } from "react";
import {
    assignTilePerlinOverlay,
    generatePerlinMap,
    MapTile,
    NoiseLayer,
    Point2D,
    findMST,
    ridgedPerlinNoise2D,
    findPathAStar,
} from "./util/grid2DUtil";
import { createNoise2D } from "simplex-noise";

const WIDTH = 128;
const HEIGHT = 128;
const TILE_SIZE = 4;


/**
 * Helper function to add new points to an existing MST without re-computing the whole thing
 * @param map The grid / graph
 * @param currentPoints The current points in the MST
 * @param newPoint New point to add to MST
 * @param currentMST The current MST
 * @param bridgeAllowance Allowed bridging over unwalkable tiles
 * @param bridgeCost Cost per bridge tile
 * @returns MST as paths with a list of disconnected points
 */
function updateMSTWithNewPoint(
    map: MapTile[][],
    currentPoints: Point2D[],
    newPoint: Point2D,
    currentMST: { paths: Point2D[], disconnectedPoints: Point2D[] },
    bridgeAllowance: number,
    bridgeCost: number
) {
    // Compute shortest paths from new point to all existing points in MST
    const candidates: { cost: number, path: Point2D[] }[] = [];
    for (const existing of currentPoints) {
        const path = findPathAStar(map, newPoint, existing, bridgeAllowance, bridgeCost);
        if (path) {
            candidates.push({ cost: path.length, path });
        }
    }

    // Pick the cheapest connection
    candidates.sort((a, b) => a.cost - b.cost);
    const best = candidates[0];

    if (!best) {
        // Can't connect, mark as disconnected
        return {
            paths: [...currentMST.paths],
            disconnectedPoints: [...currentMST.disconnectedPoints, newPoint]
        };
    }

    // Add the new path into MST
    return {
        paths: [...currentMST.paths, best.path],
        disconnectedPoints: currentMST.disconnectedPoints.filter(
            p => !(p.x === newPoint.x && p.y === newPoint.y)
        )
    };
}



export default function MSTRoads() {
    const [map, setMap] = useState<MapTile[][]>([]);
    const [noiseLayers, setNoiseLayers] = useState<NoiseLayer[]>(() => [
        { noise: createNoise2D(), scale: 80, factor: 0.5 },             // Main map
        { noise: ridgedPerlinNoise2D(true, 3), scale: 30, factor: 0.3 }, // Ridged perlin noise for rivers
        { noise: ridgedPerlinNoise2D(false, 3), scale: 30, factor: 0.2 } // Ridged perlin noise for bridging land
    ]);

    // User-defined points
    const [points, setPoints] = useState<Point2D[]>([]);
    const [disconnectedPoints, setDisconnectedPoints] = useState<Point2D[]>([]);

    // Tiles within the MST
    const [allMstTiles, setAllMstTiles] = useState<Point2D[]>([]);

    // MST has been attempted
    const [mstAttempted, setMstAttempted] = useState(false);

    // Budget we can use to get in inaccessible POIs
    const [bridgeAllowance, setBridgeAllowance] = useState(10); // Number of bridges allowed
    const [bridgeCost, setBridgeCost] = useState(5); // Cost per bridge



    useEffect(() => {
        const perlinMap = generatePerlinMap(HEIGHT, WIDTH, noiseLayers, -0.1, 0.35);
        setMap(perlinMap);
    }, [noiseLayers]);

    /**
     * Set POI points with clicks
     * @param x Tile x
     * @param y Tile y
     * @returns 
     */
    const handleClickTile = (x: number, y: number) => {
        const tile = map[y][x];
        if (!tile.tileType) return;

        const isWalkable = tile.tileType !== "Water" && tile.tileType !== "Stone";
        if (!isWalkable) return;

        const alreadySelected = points.some(p => p.x === x && p.y === y);
        if (alreadySelected) return;

        const newPoint: Point2D = { x, y };
        setPoints((prev) => [...prev, newPoint]);
    };

    // Connect all points in MST when we have 2+ points (repeats for new points)
    useEffect(() => {
        if (points.length > 1) {
            setMstAttempted(true);

            // No MST, compute one (also re-compute when bridge allowance/cost changes)
            if (allMstTiles.length === 0 || bridgeAllowance || bridgeCost) {
                const { paths, disconnectedPoints } = findMST(map, points, bridgeAllowance, bridgeCost);
                // Flatten 2D array of paths (MST) into direct MST tiles
                setAllMstTiles(paths.flat());
                setDisconnectedPoints(disconnectedPoints);
            }
            // Append to existing MST
            else {
                const newPoint = points[points.length - 1];
                const updated = updateMSTWithNewPoint(
                    map,
                    points.slice(0, -1),
                    newPoint,
                    { paths: allMstTiles, disconnectedPoints: disconnectedPoints },
                    bridgeAllowance,
                    bridgeCost
                );
                // Flatten 2D array of paths (MST) into direct MST tiles
                setAllMstTiles(updated.paths.flat());
                setDisconnectedPoints(updated.disconnectedPoints);
            }
        }
    }, [points, bridgeAllowance, bridgeCost]);


    /**
     * Reset relevant stateful variables
     */
    const resetAll = () => {
        setPoints([]);
        setAllMstTiles([]);
        setDisconnectedPoints([]);
        setMstAttempted(false);
    };

    /**
     * Render the perlin map and MST overlay
     * @returns 
     */
    const renderMap = () => (
        <div
            className="relative"
            style={{ width: WIDTH * TILE_SIZE, height: HEIGHT * TILE_SIZE }}
        >
            {/* MST Overlay */}
            <div
                className="absolute grid z-20 pointer-events-none"
                style={{ gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)` }}
            >
                {map.flat().map((tile) => {
                    const { x, y } = tile.gridCoordinates;
                    const isPOI = points.some((p) => p.x === x && p.y === y);
                    const isDisconnected = disconnectedPoints.some((p) => p.x === x && p.y === y);
                    const isMST = allMstTiles.some((p) => p.x === x && p.y === y);
                    const isBridge = isMST && (
                        map[y][x].tileType === "Water" || map[y][x].tileType === "Stone"
                    );

                    let bgColor = "transparent";

                    if (isPOI) {
                        bgColor = isDisconnected
                            ? "bg-red-500 bg-opacity-70"
                            : "bg-white bg-opacity-70";
                    } else if (isMST) {
                        bgColor = `bg-amber-400 bg-opacity-60 border-1 ${isBridge ? "" : "border-amber-500"}`;
                    }

                    const poiIndex = points.findIndex(p => p.x === x && p.y === y);

                    return (
                        <div
                            key={`overlay-${x}-${y}`}
                            className={`${bgColor} relative flex items-center justify-center`}
                            style={{ width: TILE_SIZE, height: TILE_SIZE, fontSize: TILE_SIZE * 2.5 }}
                        >
                            {isPOI && (
                                <span className={`${isDisconnected ? "text-red-600" : "text-white"} select-none`}>
                                    {`Point ${poiIndex + 1} \n (${x},${y})`}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>


            {/* Base perlin map */}
            <div
                className="absolute grid z-10"
                style={{ gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)` }}
            >
                {map.flat().map((tile) => {
                    if (!tile.tileType) return null;
                    return (
                        <div
                            onClick={() =>
                                handleClickTile(tile.gridCoordinates.x, tile.gridCoordinates.y)
                            }
                            key={`tile-${tile.gridCoordinates.x}-${tile.gridCoordinates.y}`}
                            className="border border-[rgba(17,17,17,0.1)] box-border"
                            style={{
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                backgroundColor: assignTilePerlinOverlay(tile.tileType),
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-2">
                Building "Roads" with a Minimum Spanning Tree (MST)
            </h1>
            <p className="mb-4">Each point of interest has a bridge budget to bridge to inaccessible points</p>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="mt-9">{renderMap()}</div>
                <div className="flex flex-col gap-4 w-[35vw]">
                    <h2 className="text-lg">Instructions</h2>
                    <ol className="list-decimal ml-5 space-y-1">
                        <li>Click on non-obstacle (green) tiles to place points</li>
                        <li>Click "Connect Points" to compute an MST based on the first point</li>
                    </ol>
                    <p className="font-semibold">Notes</p>
                    <ul className="list-disc ml-5 space-y-1">
                        <li>Inaccessible points will attempt to bridge to connected points within range of their bridge allowance</li>
                        <li>Bridge cost affects how bridges are used in the path (the MST will opt for lowest cost paths)</li>
                    </ul>

                    <hr className="text-green-600" />

                    <div className="flex flex-col gap-2">
                        <label>
                            Bridge Allowance per Point: {bridgeAllowance}
                            <input
                                type="range"
                                min={0}
                                max={50}
                                value={bridgeAllowance}
                                onChange={(e) => setBridgeAllowance(Number(e.target.value))}
                                className="w-full"
                            />
                        </label>
                        <label>
                            Bridge Cost: {bridgeCost}
                            <input
                                type="range"
                                min={0}
                                max={10}
                                value={bridgeCost}
                                onChange={(e) => setBridgeCost(Number(e.target.value))}
                                className="w-full"
                            />
                        </label>
                    </div>

                    <hr className="text-blue-600" />

                    {/* MST status */}
                    {
                        mstAttempted ? (
                            allMstTiles.length > 0 ? (
                                <p className="text-green-600 font-semibold">
                                    {`MST total length: ${allMstTiles.length} steps`}
                                </p>
                            ) : (
                                <p className="text-red-600 font-semibold">
                                    Points do not connect
                                </p>
                            )
                        ) : (
                            <p>Place 2+ points for MST</p>
                        )
                    }



                    <button
                        onClick={resetAll}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700"
                    >
                        Reset Points
                    </button>
                    <button
                        onClick={() => {
                            const newNoiseLayers: NoiseLayer[] = [
                                { noise: createNoise2D(), scale: noiseLayers[0].scale, factor: noiseLayers[0].factor },
                                { noise: ridgedPerlinNoise2D(true, 3), scale: noiseLayers[1].scale, factor: noiseLayers[1].factor },
                                { noise: ridgedPerlinNoise2D(false, 3), scale: noiseLayers[2].scale, factor: noiseLayers[2].factor },
                            ];
                            setNoiseLayers(newNoiseLayers);
                            resetAll();
                        }}
                        className={`
                            default px-4 py-2 bg-blue-700
                            text-white rounded hover:bg-blue-900
                        `}
                    >
                        Reset Perlin Noise Map
                    </button>
                </div>
            </div>
        </div>
    );
}
