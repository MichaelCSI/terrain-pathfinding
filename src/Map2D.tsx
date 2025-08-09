import { useEffect, useState } from "react";
import { assignTilePerlinOverlay, findPathAStar, generatePerlinMap, MapTile } from "./util/tileGrid";

const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 8;

export default function Map2D() {
    // Perlin map grid
    const [map, setMap] = useState<MapTile[][]>([]);

    // Pathfinding
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
    const [path, setPath] = useState<{ x: number; y: number }[] | null>([]);
    const [visiblePath, setVisiblePath] = useState<{ x: number; y: number }[]>([]);
    const [pathFound, setPathFound] = useState<boolean>(true);

    useEffect(() => {
        const perlinMap = generatePerlinMap(HEIGHT, WIDTH);
        setMap(perlinMap);
    }, []);

    const handleClickTile = (x: number, y: number) => {
        const tile = map[y][x];
        if (!tile.tileType) return;

        const isWalkable = tile.tileType !== "Water" && tile.tileType !== "Stone";

        if (startPoint && endPoint) {
            setStartPoint(null);
            setEndPoint(null);
            setPath(null);
            setPathFound(false);
            return;
        }

        if (!startPoint) {
            if (!isWalkable) return;
            setStartPoint({ x, y });
        } else if (!endPoint) {
            if (!isWalkable) return;
            setEndPoint({ x, y });
            const result = findPathAStar(map, startPoint, { x, y });
            if (result) {
                setPath(result);
                setVisiblePath([]);
                result.forEach((tile, index) => {
                    setTimeout(() => {
                        setVisiblePath((prev) => [...prev, tile]);
                    }, index * 50);
                });
                setPathFound(true);
            } else {
                setPathFound(false);
            }
        }
    };

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
                            const isPathTile = visiblePath.some(
                                (p) =>
                                    p.x === tile.gridCoordinates.x &&
                                    p.y === tile.gridCoordinates.y
                            );

                            return (
                                <div
                                    key={`path-overlay-${tile.gridCoordinates.x}-${tile.gridCoordinates.y}`}
                                    className={isPathTile ? "bg-red-600 bg-opacity-60" : "bg-transparent"}
                                    style={{ width: TILE_SIZE, height: TILE_SIZE }}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Perlin overlay layer */}
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
            <h1 className="text-2xl font-bold mb-4">2D Tiled Map Demo</h1>
            <div className="flex flex-col md:flex-row gap-6">
                <div>{renderMap()}</div>

                <div className="flex flex-col gap-4">

                    <h2 className="text-lg">Instructions</h2>
                    <div className="flex flex-col gap-4">
                        <p>Click on two grass (green) tiles</p>
                        <p>A* will attempt to find a walkable path</p>
                        <p>Water (blue) and Stone (grey) are not walkable</p>
                    </div>
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
                        {endPoint ? (
                            pathFound ? (
                                <p className="text-green-600 font-semibold">{`Path found! (${path?.length} steps)`}</p>
                            ) : (
                                <p className="text-red-600 font-semibold mb-0">No path found!</p>
                            )
                        ) : <p>No path defined</p>}
                    </div>
                    <hr className="text-blue-700"></hr>

                    <button
                        onClick={() => {
                            const perlinMap = generatePerlinMap(HEIGHT, WIDTH);
                            setMap(perlinMap);
                            setStartPoint(null);
                            setEndPoint(null);
                            setPath(null);
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
