import { useEffect, useState, useRef } from "react";
import { assignTilePerlinOverlay, findPathAStar, findPathAStarGenerator, generatePerlinMap, MapTile, NoiseLayer, Point2D } from "./util/grid2DUtil";
import { createNoise2D } from "simplex-noise";

const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 8;

export default function Map2D() {
    // Perlin map grid
    const [map, setMap] = useState<MapTile[][]>([]);
    const [noiseLayers, setNoiseLayers] = useState<NoiseLayer[]>(() => [
        { noise: createNoise2D(), scale: 10, factor: 1 }
    ]);

    // Pathfinding
    const [startPoint, setStartPoint] = useState<Point2D | null>(null);
    const [endPoint, setEndPoint] = useState<Point2D | null>(null);
    const [path, setPath] = useState<Point2D[] | null>([]);
    const [pathFound, setPathFound] = useState<string>("No path defined");

    // Visualization
    const [visiblePath, setVisiblePath] = useState<Point2D[]>([]);
    const [visibleCurrentTile, setVisibleCurrentTile] = useState<Point2D | null>(null);
    const [visibleClosedSetTiles, setVisibleClosedSetTiles] = useState<Point2D[]>([]);
    const [visibleOpenSetTiles, setVisibleOpenSetTiles] = useState<Point2D[]>([]);

    // Option to use generator function for A* and show the pathfinding process
    const [showPathfindingProcess, setShowPathfindingProcess] = useState<boolean>(false);
    // Store generator visualization process in a ref so we can cancel it when needed
    const pathfindingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // Store regular A* interval in a ref so we can cancel it when needed
    const pathfindingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);


    /**
     * Helper function to reset the state of the map
     */
    const resetState = () => {
        setStartPoint(null);
        setEndPoint(null);
        setPath([]);

        setVisibleCurrentTile(null);
        setVisiblePath([]);
        setVisibleClosedSetTiles([]);
        setVisibleOpenSetTiles([]);

        setPathFound("No path defined");

        // Clear any previous interval from pathfinding generator
        if (pathfindingIntervalRef.current) {
            clearInterval(pathfindingIntervalRef.current);
            pathfindingIntervalRef.current = null;
        }

        // Clear any intervals from regular pathfinding
        pathfindingTimeoutsRef.current.forEach(clearTimeout);
        pathfindingTimeoutsRef.current = [];
    }

    useEffect(() => {
        resetState();

        const perlinMap = generatePerlinMap(HEIGHT, WIDTH, noiseLayers, 0, 0.8);
        setMap(perlinMap);
    }, [noiseLayers]);

    /**
     * Handle whenever the user clicks a tile on the map
     * @param x Tile x coordinate
     * @param y Tile y coordinate
     * @returns 
     */
    const handleClickTile = (x: number, y: number) => {
        const tile = map[y][x];
        if (!tile.tileType) return;

        const isWalkable = tile.tileType !== "Water" && tile.tileType !== "Stone";

        if (startPoint && endPoint) {
            resetState();
            return;
        }

        const clickedPoint: Point2D = { x, y };

        if (!startPoint) {
            // Start tile is not walkable
            if (!isWalkable) return;

            setStartPoint(clickedPoint);
        } else if (!endPoint) {
            // End tile is not walkable
            if (!isWalkable) return;

            // endPoint is set but state setting is asynchronous so reference clickedPoint in its place
            // since endPoint is still null during this function, will be updated on render
            setEndPoint(clickedPoint);

            if (showPathfindingProcess) {
                const generator = findPathAStarGenerator(map, startPoint, clickedPoint);
                let generatorStep = generator.next();
                setPathFound("Searching...");

                pathfindingIntervalRef.current = setInterval(() => {
                    // Final step in generator is reached without finding a path and exiting
                    if (generatorStep.done) {
                        setPathFound("No path found!");
                        clearInterval(pathfindingIntervalRef.current!);
                        pathfindingIntervalRef.current = null;
                        return;
                    }

                    const { currentNode, openSet, closedSet, finalPath } = generatorStep.value;

                    // Set visibility variables for rendering pathfinding
                    setVisibleCurrentTile(currentNode);
                    setVisibleClosedSetTiles([...closedSet].map(str => {
                        const [cx, cy] = str.split(',').map(Number);
                        return { x: cx, y: cy };
                    }));
                    setVisibleOpenSetTiles([...openSet].map(node => ({ x: node.x, y: node.y })));

                    // finalPath returned as part of generator output means a path was found
                    if (finalPath.length > 0) {
                        setPathFound("Path found!");
                        setPath(finalPath);
                        setVisiblePath(finalPath);
                        clearInterval(pathfindingIntervalRef.current!);
                        pathfindingIntervalRef.current = null;
                    }

                    generatorStep = generator.next();
                }, 50);
            }
            else {
                const result = findPathAStar(map, startPoint, clickedPoint);
                if (result) {
                    setPath(result);
                    setVisiblePath([]);
                    result.forEach((tile, index) => {
                        const timeoutId = setTimeout(() => {
                            setVisiblePath((prev) => [...prev, tile]);
                        }, index * 50);
                        pathfindingTimeoutsRef.current.push(timeoutId);
                    });
                    setPathFound("Path found!");
                } else {
                    setPathFound("No path found!");
                }

            }
        }
    };


    /**
     * Render the main map with the perlin layer (base map) and path layer (pathing overlay)
     * @returns 
     */
    const renderMap = () => {
        return (
            <div
                className="relative"
                style={{ width: WIDTH * TILE_SIZE, height: HEIGHT * TILE_SIZE }}
            >
                {/* Path overlay layer */}
                {path && (
                    <div
                        className="absolute grid z-20 pointer-events-none"
                        style={{ gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)` }}
                    >
                        {map.flat().map((tile) => {
                            const { x, y } = tile.gridCoordinates;

                            const isStart = startPoint && startPoint.x === x && startPoint.y === y;
                            const isEnd = endPoint && endPoint.x === x && endPoint.y === y;

                            const isPathTile = visiblePath.some(p => p.x === x && p.y === y);
                            const isCurrent = visibleCurrentTile && visibleCurrentTile.x === x && visibleCurrentTile.y === y;
                            const isClosedSet = visibleClosedSetTiles.some(p => p.x === x && p.y === y);
                            const isOpenSet = visibleOpenSetTiles.some(p => p.x === x && p.y === y);

                            let bgColor = "bg-transparent";

                            if (isStart || isEnd) {
                                bgColor = "bg-white bg-opacity-60";
                            } else if (endPoint) {
                                if (isPathTile) bgColor = "bg-red-600 bg-opacity-60";
                                else if (isCurrent) bgColor = "bg-yellow-400 bg-opacity-60";
                                else if (isClosedSet) bgColor = "bg-gray-400 bg-opacity-40";
                                else if (isOpenSet) bgColor = "bg-black bg-opacity-40";
                            }

                            return (
                                <div
                                    key={`path-overlay-${x}-${y}`}
                                    className={bgColor}
                                    style={{ width: TILE_SIZE, height: TILE_SIZE }}
                                />
                            );
                        })}

                    </div>
                )}

                {/* Perlin map overlay layer */}
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
                                key={`overlay-${tile.gridCoordinates.x}-${tile.gridCoordinates.y}`}
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
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-2">A* pathfinding in a 2D grid based on perlin noise</h1>
            <p className="mb-4">The algorithm runs on a time interval for visualization purposes</p>
            <div className="flex flex-col md:flex-row gap-6">
                <div>{renderMap()}</div>

                <div className="flex flex-col gap-4">

                    <h2 className="text-lg">Instructions</h2>
                    <ol className="list-decimal ml-5 space-y-1">
                        <li>Click on two grass (green) tiles</li>
                        <li>A* will attempt to find a walkable path</li>
                    </ol>
                    <p className="font-semibold">Notes</p>
                    <ul className="list-disc ml-5 space-y-1">
                        <li>Water (blue) and Stone (grey) are not walkable</li>
                    </ul>
                    <hr className="text-green-700"></hr>

                    <div>
                        {startPoint ?
                            <p>{`Start point: (${startPoint.x}, ${startPoint.y})`}</p>
                            : <p>{`Start point: (---, ---)`}</p>
                        }
                        {endPoint ?
                            <p>{`End point: (${endPoint.x}, ${endPoint.y})`}</p>
                            : <p>{`End point: (---, ---))`}</p>
                        }
                        {endPoint && pathFound === "Path found!" && (
                            <p className="text-green-600 font-semibold">
                                {`${pathFound} (${path?.length} steps)`}
                            </p>
                        )}

                        {endPoint && pathFound === "No path found!" && (
                            <p className="text-red-600 font-semibold mb-0">{pathFound}</p>
                        )}

                        {(pathFound === "No path defined" || pathFound === "Searching...") && <p>{pathFound}</p>}
                    </div>
                    <hr className="text-blue-700"></hr>

                    <button
                        onClick={() => {
                            const newNoiseLayers: NoiseLayer[] = [
                                { noise: createNoise2D(), scale: noiseLayers[0].scale, factor: noiseLayers[0].factor }
                            ];
                            setNoiseLayers(newNoiseLayers);
                        }}
                        className={`
                            default px-4 py-2 bg-blue-700
                            text-white rounded hover:bg-blue-900
                        `}
                    >
                        Reset Perlin Noise Map
                    </button>
                    <button
                        onClick={() => {
                            setShowPathfindingProcess(!showPathfindingProcess)
                        }}
                        className={`
                            default px-4 py-2 ${showPathfindingProcess ? "bg-green-800" : "bg-gray-600"}
                            text-white rounded ${showPathfindingProcess ? "hover:bg-green-900" : "hover:bg-gray-700"}
                        `}
                    >
                        {showPathfindingProcess ? "Click to visualize only final path" : "Click to visualize pathfinding process"}
                        {showPathfindingProcess ? (
                            <div className="flex flex-col mt-4 gap-2">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 w-[50%]">
                                        <div className="w-4 h-4 bg-yellow-400"></div>
                                        <span>Current tile</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-[50%]">
                                        <div className="w-4 h-4 bg-black"></div>
                                        <span>Open set</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 w-[50%]">
                                        <div className="w-4 h-4 bg-gray-400"></div>
                                        <span>Closed set</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-[50%]">
                                        <div className="w-4 h-4 bg-red-600"></div>
                                        <span>Path</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center mt-4 gap-2 w-[50%]">
                                <div className="w-4 h-4 bg-red-600"></div>
                                <span>Path</span>
                            </div>
                        )}

                    </button>
                </div>
            </div>
            <p className="mt-8 text-xl">A* finds the shortest path by exploring graph nodes in a prioritized order.</p>
            <hr className="text-gray-300 my-2"></hr>
            <p className="text-lg mt-4">The Open Set</p>
            <p>
                Nodes to be explored - prioritized based on a cost estimate (usually the sum of the path to the current node + a heuristic estimate to the goal).
                The heuristic is some distance metric estimation, in this case it is manhatten distance since we are within a grid. It is an estimate because
                it assumes we can take a direct path and does not consider possible obstacles (such as unwalkable water or rocks in this case). This direct approach
                ensures it will never ignore a lower-cost alternative path.
            </p>
            <p className="text-lg mt-4">The Closed Set</p>
            <p>Nodes that have already been explored and evaluated - they will not be reconsidered.</p>
            <p className="text-lg mt-4">The Step</p>
            <p>
                At each step, a walkable (non-obstacle) node from the open set with the lowest estimated cost (sum of current path + heuristic estimate) is selected.
                Its neighbors are examined, and their estimated costs and parent links are updated as necessary.
            </p>
            <p className="text-lg mt-4">The Final Path</p>
            <p>
                Once the end point is reached, the algorithm reconstructs the path by following the parent links from the end node back to the start.
                This results in the shortest / lowest-cost path.
            </p>

        </div>
    );
}
