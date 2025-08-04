import { useEffect, useState } from "react";
import { assignTile, generatePerlinMap, getTileCoordsFromTilemap, MapTile } from "./util";

const WIDTH = 32;
const HEIGHT = 32;
const TILE_SIZE = 16;


export default function Generation() {
    const [tiles, setTiles] = useState<any[]>([]);
    const [map, setMap] = useState<MapTile[][]>([]);
    const [perlinOverlay, setPerlinOverlay] = useState<boolean>(false);


    useEffect(() => {
        getTileCoordsFromTilemap({
            filePath: "/tiles/Fences.png",
            tileSize: 16,
        }).then((tiles) => {
            setTiles(tiles);
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

                {/* Perlin overlay layer */}
                {perlinOverlay &&
                    <div
                        style={{
                            position: "absolute",
                            display: "grid",
                            gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)`,
                            zIndex: 1,
                        }}
                    >
                        {map.flat().map((tile) => (
                            <div
                                key={`overlay-${tile.x}-${tile.y}`}
                                style={{
                                    width: TILE_SIZE,
                                    height: TILE_SIZE,
                                    backgroundColor: assignTile(tile.tileType),
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
                    <button onClick={() => {setPerlinOverlay(!perlinOverlay)}}>
                        Toggle <b>Perlin</b> Overlay
                    </button>
                </div>
            </div>
        </div>
    );
}
