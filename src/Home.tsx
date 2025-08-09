import { useState, useEffect, useRef } from 'react';
import { findPathAStar, MapTile, Point2D } from './util/tileGrid';

const GRID_SIZE = 40;
const OBSTACLE_PROBABILITY = 0.2;
const INITIAL_SNAKE: Point2D[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 1, y: 10 },
    { x: 0, y: 10 },
];


/**
 * Create a 2D grid with tiles that may or may not be walkable
 * @param snake The snake represented by a 2D contiguous point array
 * @returns A 2D grid of Map tiles
 */
function createWalkableGrid(snake: Point2D[]): MapTile[][] {
    return Array(GRID_SIZE).fill(null).map((_, y) =>
        Array(GRID_SIZE).fill(null).map((_, x) => {
            const isSnake = snake.some(p => p.x === x && p.y === y);
            const isObstacle = !isSnake && Math.random() < OBSTACLE_PROBABILITY;

            return {
                gridCoordinates: { x, y },
                walkable: !isSnake && !isObstacle
            };
        })
    );
}


/**
 * Create a random target cell in the grid
 * @param snake The snake array
 * @returns The target cell in the grid
 */
function computeTargetPath(snake: Point2D[], grid: MapTile[][]) {
    let target: Point2D;
    let path: Point2D[] | null;
    let attempts = 0;

    // Create a target that is not on the snake, on an obstacle, or unpathable
    do {
        target = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
        };
        path = findPathAStar(grid, snake[0], target);
        attempts++;
        if (attempts >= 100) {
            console.log("No possible target found after 100 attempts.");
            return { target: snake[0], path: [] };
        }
    } while (
        snake.some(p => p.x === target.x && p.y === target.y) ||
        !grid[target.y][target.x].walkable ||
        !path
    );

    return { target, path };
}



export default function Home() {
    // Initil snake position, grid, target, and path
    const [snake, setSnake] = useState<Point2D[]>(INITIAL_SNAKE);
    const [grid, _] = useState<MapTile[][]>(createWalkableGrid(snake))
    const [target, setTarget] = useState<Point2D>(computeTargetPath(snake, grid).target);

    // Calculate initial path ... slice(1) to not count snake head
    const initialPath = findPathAStar(grid, snake[0], target) ?? [];
    const [path, setPath] = useState<Point2D[]>(initialPath.slice(1));

    // Move the snake at regular intervals
    useEffect(() => {
        const interval = setInterval(() => {
            setSnake((prevSnake) => {
                if (path.length <= 0) return prevSnake;
                // Next step on path
                const nextStep = path[0];
                const newSnake = [nextStep, ...prevSnake.slice(0, -1)];

                // Check if next step is the target
                const reachedTarget = nextStep.x === target.x && nextStep.y === target.y;

                // Reached target, switch targets and create a new path
                if (reachedTarget) {
                    // Pick new target
                    const { target: newTarget, path: newPath } = computeTargetPath(newSnake, grid);
                    setTarget(newTarget);
                    setPath(newPath.slice(1));
                } else {
                    // Remove the first step from path, continue following
                    setPath(path.slice(1));
                }

                return newSnake;
            });
        }, 10);

        return () => clearInterval(interval);
    }, [snake]);


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Exploring Terrain Generation and Pathfinding Algorithms</h1>
            <div className="flex">
                <div className="flex-1 overflow-auto pr-4">
                    <h3 className="text-xl font-semibold mb-2">Small, static 2D maps</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>A*, Jump Point Search, Theta*</li>
                        <li>A* is fast and optimal; JPS speeds up uniform grids; Theta* allows smoother, any-angle paths</li>
                        <li>Bonus: Smoothing terrain
                            <ul className="list-disc list-inside ml-5">
                                <li>Theta*, Lazy Theta*, Field D*</li>
                                <li>E.g. Bézier curves to avoid zig zags</li>
                            </ul>
                        </li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-2">Weighted terrain</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>A* with custom costs, Fringe Search, Field D*</li>
                        <li>Handles different movement costs like mud, hills, etc.</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-2">Large open world (generally flat)</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>HPA*, NavMesh, Flow Fields</li>
                        <li>Breaks world into regions or polygons; efficient for large maps and many agents</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-2">3D continuous space (moving in X/Y/Z e.g. flying)</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>3D A*, PRM, RRT*, Visibility Graphs (expensive)
                            <ul className="list-disc list-inside ml-5">
                                <li>Also good for High obstacle density (tight navigation)</li>
                            </ul>
                        </li>
                        <li>Works in volumetric spaces; PRM/RRT handle complex obstacles</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-2">Dynamic changing map</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>D* Lite, Dynamic A*, ARA*</li>
                        <li>Quickly replans when obstacles appear/disappear</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-2">Multi-agent</h3>
                    <ul className="list-disc list-inside mb-4">
                        <li>Cooperative A*, CBS, Flow Fields</li>
                        <li>Avoids collisions and coordinates groups</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-2">Crowds / Swarms</h3>
                    <ul className="list-disc list-inside">
                        <li>Flow Fields, Boids, Ant Colony Optimization</li>
                        <li>Scales well with many agents; natural movement patterns</li>
                    </ul>
                </div>

                <div className="flex-1 flex justify-center items-center h-[75vh]">
                    <div
                        className="grid border border-white"
                        style={{
                            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                            width: '80%',
                            height: '80%',
                        }}
                    >
                        {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => {
                            const x = i % GRID_SIZE;
                            const y = Math.floor(i / GRID_SIZE);
                            const isSnake = snake.some((part) => part.x === x && part.y === y);
                            const isTarget = target.x === x && target.y === y;
                            const isObstacle = !grid[y][x].walkable;
                            let color = 'transparent';
                            if (isTarget) {
                                color = 'red';
                            } else if (isSnake) {
                                color = 'green';
                            } else if (isObstacle) {
                                color = 'grey';
                            }

                            return (
                                <div
                                    key={i}
                                    style={{ backgroundColor: color }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
