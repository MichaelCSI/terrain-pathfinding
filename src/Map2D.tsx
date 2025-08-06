import { useEffect, useState } from "react";
import { assignTilePerlinOverlay, findPathAStar, generatePerlinMap, MapTile } from "./util";

const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 8;


export default function Map2D() {
    // Tilemap and perlin overlay
    const [tiles, setTiles] = useState<any[]>([]);
    const [map, setMap] = useState<MapTile[][]>([]);

    // Pathfinding
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
    const [path, setPath] = useState<{ x: number; y: number }[] | null>([]);
    const [visiblePath, setVisiblePath] = useState<{ x: number; y: number }[]>([]);
    const [pathFound, setPathFound] = useState<boolean>(true);


    /**
     * Pathfinding on tile clicks - determine and animate path
     * @param x Tile x
     * @param y Tile y
     */
    const handleClickTile = (x: number, y: number) => {
        const tile = map[y][x];
        if (!tile.tileType) return;

        // Determine if tile is walkable
        const isWalkable = tile.tileType !== "Water" && tile.tileType !== "Stone";

        // Reset if we have already done a path
        if (startPoint && endPoint) {
            setStartPoint(null);
            setEndPoint(null);
            setPath(null);
            setPathFound(false);
            return;
        }

        // First point
        if (!startPoint) {
            if (!isWalkable) return;

            setStartPoint({ x, y });
        }
        // Second point and path between first and second
        else if (!endPoint) {
            if (!isWalkable) return;

            setEndPoint({ x, y });
            const result = findPathAStar(map, startPoint, { x, y });
            if (result) {
                setPath(result);

                // Animate path
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



    useEffect(() => {
        setTiles(tiles);
        const perlinMap = generatePerlinMap(HEIGHT, WIDTH);
        setMap(perlinMap);
    }, []);


    const renderMap = () => {
        return (
            <div
                style={{
                    width: WIDTH * TILE_SIZE,
                    height: HEIGHT * TILE_SIZE,
                    position: 'relative'
                }}
            >
                {/* Path overlay layer */}
                {path && (
                    <div
                        style={{
                            position: "absolute",
                            display: "grid",
                            gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)`,
                            zIndex: 2,
                            pointerEvents: "none"
                        }}
                    >
                        {map.flat().map((tile) => {

                            // Visible path animation
                            const isPathTile = visiblePath.some(
                                p => p.x === tile.gridCoordinates.x &&
                                    p.y === tile.gridCoordinates.y
                            );

                            return (
                                <div
                                    key={`path-overlay-${tile.gridCoordinates.x}-${tile.gridCoordinates.y}`}
                                    style={{
                                        width: TILE_SIZE,
                                        height: TILE_SIZE,
                                        backgroundColor: isPathTile ? "rgba(255, 0, 0, 0.6)" : "transparent",
                                    }}
                                />
                            );
                        })}
                    </div>
                )}



                {/* Perlin overlay layer */}
                <div
                    style={{
                        position: "absolute",
                        display: "grid",
                        gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)`,
                        zIndex: 1,
                    }}
                >
                    {map.flat().map((tile) => {
                        if (!tile.tileType) return;

                        return (
                            <div
                                onClick={() => handleClickTile(tile.gridCoordinates.x, tile.gridCoordinates.y)}
                                key={`overlay-${tile.gridCoordinates.x}-${tile.gridCoordinates.y}`}
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    backgroundColor: assignTilePerlinOverlay(tile.tileType),
                                    border: '0.1px solid rgba(17, 17, 17, 0.1)',
                                    boxSizing: "border-box"
                                }}
                            />
                        )
                    }
                    )}
                </div>
            </div>
        );
    };


    return (
        <div>
            <h1>2D Tiled Map Demo</h1>
            <div className="noise-container">
                {renderMap()}
                <div className="button-list">
                    <button onClick={() => {
                        const perlinMap = generatePerlinMap(HEIGHT, WIDTH);
                        setMap(perlinMap);
                        setStartPoint(null);
                        setEndPoint(null);
                        setPath(null);
                    }}>
                        Reset Perlin Noise Map
                    </button>

                    <div style={{marginTop: '20px'}}>
                        <p>Click on two grass (green) tiles</p>
                        <p>A* will attempt to find a walkable path</p>
                        <p>Water (blue) and Stone (grey) are not walkable</p>
                    </div>

                    <div>
                        {startPoint && <p>{`Start point is: (${startPoint.x}, ${startPoint.y})`}</p>}
                        {endPoint && <p>{`End point is: (${endPoint.x}, ${endPoint.y})`}</p>}
                        {endPoint ? pathFound ?
                            <p>Path found!</p> :
                            <p style={{ marginBottom: 0 }}>No path found!</p> :
                            null
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
