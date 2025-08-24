import { useState, useEffect, useRef } from 'react';
import { findPathAStar, MapTile, Point2D } from './util/grid2DUtil';

const GRID_SIZE_X = 80;
const GRID_SIZE_Y = 50;
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
    return Array(GRID_SIZE_Y).fill(null).map((_, y) =>
        Array(GRID_SIZE_X).fill(null).map((_, x) => {
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
            x: Math.floor(Math.random() * GRID_SIZE_X),
            y: Math.floor(Math.random() * GRID_SIZE_Y),
        };
        path = findPathAStar(grid, snake[0], target);
        attempts++;
        if (attempts >= 100) {
            console.log("No possible target found after 100 attempts.");
            return { target: snake[0], path: [] };
        }
    } while (
        // Repeat target finding until we get a point not on the snake that is pathable
        snake.some(p => p.x === target.x && p.y === target.y) ||
        !path
    );

    return { target, path };
}



export default function Home() {
    const containerRef = useRef<HTMLDivElement>(null);

    // Initil snake position, grid, target, and path
    const [snake, setSnake] = useState<Point2D[]>(INITIAL_SNAKE);
    const [grid, _] = useState<MapTile[][]>(createWalkableGrid(snake));
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
        <div className="w-full h-[92vh] relative">
            <h1 className="z-10 text-4xl font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                Terrain Generation and Pathfinding Algorithms
            </h1>
            <div
                className="grid w-full h-full aspect-square mx-auto"
                style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE_X}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${GRID_SIZE_Y}, minmax(0, 1fr))`
                }}
            >
                {[...Array(GRID_SIZE_X * GRID_SIZE_Y)].map((_, i) => {
                    const x = i % GRID_SIZE_X;
                    const y = Math.floor(i / GRID_SIZE_X);
                    const isSnake = snake.some((part) => part.x === x && part.y === y);
                    const isTarget = target.x === x && target.y === y;
                    const isObstacle = !grid[y][x].walkable;
                    let color = 'transparent';
                    if (isTarget) {
                        color = 'red';
                    } else if (isSnake) {
                        color = 'var(--color-secondary)';
                    } else if (isObstacle) {
                        color = 'var(--color-menu-bg)';
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
    );
}
