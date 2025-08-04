import { useEffect, useState } from "react";
import { generatePerlinMap, getTileCoordsFromTilemap, MapTile } from "./util";

const WIDTH = 8;
const HEIGHT = 8;
const TILE_SIZE = 64;


export default function Generation() {
    const [tiles, setTiles] = useState<any[]>([]);
    const [map, setMap] = useState<MapTile[][]>([]);


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
                className="noise-map"
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)`,
                }}
            >
                {map.flat().map((tile) => (
                    <div
                        key={`${tile.x}-${tile.y}`}
                        style={{
                            width: TILE_SIZE,
                            height: TILE_SIZE,
                            backgroundImage: `url(/tiles/Fences.png)`,
                            backgroundSize: `64px 64px`,
                            backgroundPosition: `-${tile.tileCoord.x}px -${tile.tileCoord.y}px`,
                            imageRendering: "pixelated",
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">2D Tiled Map Generation Demo</h2>
            <div className="noise-container">
                {renderMap()}
                <div className="button-list">
                    <button onClick={() => {generatePerlinMap(tiles, HEIGHT, WIDTH)}}>
                        Apply <b>Perlin</b> Noise
                    </button>
                </div>
            </div>
        </div>
    );
}
