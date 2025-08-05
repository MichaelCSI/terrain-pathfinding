import { useEffect, useState } from "react";
import { assignTilePerlinOverlay, findPath, generatePerlinMap, getTileCoordsFromTilemap, MapTile } from "./util";

const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 8;


export default function Map() {
    // Tilemap and perlin overlay
    const [tiles, setTiles] = useState<any[]>([]);
    const [map, setMap] = useState<MapTile[][]>([]);
    const [perlinOverlay, setPerlinOverlay] = useState<boolean>(false);

    // Pathfinding
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
    const [path, setPath] = useState<{ x: number; y: number }[] | null>([]);
    const [visiblePath, setVisiblePath] = useState<{ x: number; y: number }[]>([]);


    /**
     * Pathfinding on tile clicks - determine and animate path
     * @param x Tile x
     * @param y Tile y
     */
    const handleClickTile = (x: number, y: number) => {
        // Reset if we have already done a path
        if (startPoint && endPoint && path) {
            setStartPoint(null);
            setEndPoint(null);
            setPath(null);
            return;
        }

        // First point
        if (!startPoint) {
            setStartPoint({ x, y });
        }
        // Second point and path between first and second
        else if (!endPoint) {
            setEndPoint({ x, y });
            const result = findPath(map, startPoint, { x, y });
            if (result) {
                console.log(result)
                setPath(result);

                // Animate path
                setVisiblePath([]);
                result.forEach((tile, index) => {
                    setTimeout(() => {
                        setVisiblePath((prev) => [...prev, tile]);
                    }, index * 50);
                });
            } else {
                console.warn("No path found from", startPoint, "to", { x, y });
            }
        }
    };



    useEffect(() => {
        // Generate tile coodrinates from sample tileset
        getTileCoordsFromTilemap({
            filePath: "/tiles/Fences.png",
            tileSize: 16,
        }).then((tiles) => {
            const perlinMap = generatePerlinMap(tiles, HEIGHT, WIDTH);
            setMap(perlinMap);
        });
    }, []);


    const renderMap = () => {
        return (
            <div
                style={{
                    position: 'relative',
                    width: WIDTH * TILE_SIZE,
                    height: HEIGHT * TILE_SIZE,
                    background: '#8bc84a'
                }}
            >
                {/* Tile Layer */}
                <div
                    style={{
                        position: "absolute",
                        display: "grid",
                        gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)`,
                        zIndex: 0,
                    }}
                >
                    {map.flat().map((tile) => (
                        <div
                            key={`tile-${tile.x}-${tile.y}`}
                            onClick={() => handleClickTile(tile.x, tile.y)}
                            style={{
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                backgroundImage: `url(/tiles/${tile.tileType}.png)`,
                                // Set background to a specific tile (position) of the png
                                backgroundPosition: `-${tile.tileCoord.tileX * TILE_SIZE}px -${tile.tileCoord.tileY * TILE_SIZE}px`,
                                imageRendering: "pixelated",
                            }}
                        />
                    ))}
                </div>


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
                            const isPathTile = visiblePath.some(p => p.x === tile.x && p.y === tile.y);
                            return (
                                <div
                                    key={`path-overlay-${tile.x}-${tile.y}`}
                                    style={{
                                        width: TILE_SIZE,
                                        height: TILE_SIZE,
                                        backgroundColor: isPathTile ? "rgba(255, 0, 0, 0.4)" : "transparent",
                                        boxSizing: "border-box",
                                    }}
                                />
                            );
                        })}
                    </div>
                )}



                {/* Perlin overlay layer */}
                {perlinOverlay &&
                    <div
                        style={{
                            position: "absolute",
                            display: "grid",
                            gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)`,
                            zIndex: 1,
                            pointerEvents: "none"
                        }}
                    >
                        {map.flat().map((tile) => (
                            <div
                                key={`overlay-${tile.x}-${tile.y}`}
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    backgroundColor: assignTilePerlinOverlay(tile.tileType),
                                    border: "1px solid #111",
                                    boxSizing: "border-box"
                                }}
                            />
                        ))}
                    </div>
                }
            </div>
        );
    };


    return (
        <div>
            <h2 className="text-xl font-bold mb-4">2D Tiled Map Generation Demo</h2>
            <div className="noise-container">
                {renderMap()}
                <div className="button-list">
                    <button onClick={() => {
                        const perlinMap = generatePerlinMap(tiles, HEIGHT, WIDTH);
                        setMap(perlinMap);
                    }}>
                        Apply <b>Perlin</b> Noise
                    </button>

                    <button onClick={() => { setPerlinOverlay(!perlinOverlay) }}>
                        Toggle <b>Perlin</b> Overlay
                    </button>

                    <p style={{ marginBottom: 0 }}>Pathfinding</p>
                    <ul style={{ marginTop: 0 }}>
                        <li>Click on two tiles (third click resets)</li>
                        <li>Water is not walkable</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
