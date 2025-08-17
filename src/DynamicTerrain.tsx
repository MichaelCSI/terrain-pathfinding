import { useEffect, useState } from "react";
import { assignTilePerlinOverlay, generatePerlinMap, MapTile, NoiseLayer, ridgedPerlinNoise2D } from "./util/grid2DUtil";
import { createNoise2D } from "simplex-noise";

const WIDTH = 128;
const HEIGHT = 128;
const TILE_SIZE = 4;


export default function DynamicTerrain() {
    // Perlin map grid
    const [map, setMap] = useState<MapTile[][]>([]);
    const [noiseLayers, setNoiseLayers] = useState<NoiseLayer[]>(() => [
        { noise: createNoise2D(), scale: 80, factor: 0.5 },             // Main map
        { noise: ridgedPerlinNoise2D(true, 3), scale: 30, factor: 0.3 }, // Ridged perlin noise for rivers
        { noise: ridgedPerlinNoise2D(false, 3), scale: 30, factor: 0.2 } // Ridged perlin noise for bridging land
    ]);

    const [manualControls, setManualControls] = useState(false);
    const [time, setTime] = useState(0);


    useEffect(() => {
        const perlinMap = generatePerlinMap(HEIGHT, WIDTH, noiseLayers, -0.1, 0.3);
        setMap(perlinMap);
    }, [noiseLayers]);


    // When not in manual mode, gradually update layor factor values
    const timeInterval = 0.05;
    useEffect(() => {
        if (manualControls) return;

        const intervalPerlin = setInterval(() => {
            setTime(prev => prev + timeInterval);
            setNoiseLayers(prevLayers => [
                // Perlin layer - main layer, gradual updates
                { ...prevLayers[0], factor: 0.5 + 0.25 * Math.sin(time * 0.1) },
                // River and Land bridge layers, update more frequently 
                { ...prevLayers[1], factor: 0.5 + 0.25 * Math.sin(time * 1.5) },
                { ...prevLayers[2], factor: 0.5 + 0.25 * Math.sin(time * 1) },
            ]);
            console.log(noiseLayers[0])
        }, timeInterval * 1000);

        return () => clearInterval(intervalPerlin);
    }, [manualControls, time]);


    /**
     * Helper function to change layer factor values
     * @param index Index of the layer
     * @param value Value to set the layer factor to
     */
    const updateLayerFactor = (index: number, value: number) => {
        const updatedLayers = [...noiseLayers];
        updatedLayers[index].factor = value;
        setNoiseLayers(updatedLayers);
    };


    /**
     * Render the tile map
     * @returns 
     */
    const renderMap = () => {
        return (
            <div
                className="relative"
                style={{ width: WIDTH * TILE_SIZE, height: HEIGHT * TILE_SIZE }}
            >
                {/* Perlin overlay layer */}
                <div
                    className="absolute grid z-10"
                    style={{ gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)` }}
                >
                    {map.flat().map((tile) => {
                        if (!tile.tileType) return null;

                        return (
                            <div
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

    const layerLabels = ["Base Perlin Terrain", "Rivers (ridged perlin)", "Land Bridges (ridged perlin)"];

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-2">Dynamic Terrain</h1>
            <p className="mb-4">Three layers of noise are used: A base Perlin map and two ridged Perlin maps</p>
            <div className="flex flex-col md:flex-row gap-6">
                <div>{renderMap()}</div>

                <div className="flex flex-col gap-4">
                    <h2 className="text-lg">Dynamic / Changing Terrain and Obstacles</h2>
                    <div className="flex flex-col gap-4">
                        <p>Text 1</p>
                        <p>Text 2</p>
                        <p>Text 3</p>
                    </div>

                    <h2 className="text-lg">Noise Layer Factor Values</h2>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={manualControls}
                            onChange={() => setManualControls(!manualControls)}
                        />
                        Manual Controls
                    </label>
                    {noiseLayers.map((layer, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <label>
                                {layerLabels[i]} Factor: {layer.factor.toFixed(2)}
                            </label>
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={layer.factor}
                                onChange={(e) => updateLayerFactor(i, parseFloat(e.target.value))}
                                disabled={!manualControls}
                            />
                        </div>
                    ))}

                    <button
                        onClick={() => {
                            const newNoiseLayers: NoiseLayer[] = [
                                { noise: createNoise2D(), scale: noiseLayers[0].scale, factor: noiseLayers[0].factor },
                                { noise: ridgedPerlinNoise2D(true, 3), scale: noiseLayers[1].scale, factor: noiseLayers[1].factor },
                                { noise: ridgedPerlinNoise2D(false, 3), scale: noiseLayers[2].scale, factor: noiseLayers[2].factor },
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
                </div>
            </div>
        </div>
    );
}
