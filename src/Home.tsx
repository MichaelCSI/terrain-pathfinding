import { useState, useEffect, useRef } from 'react';
import { findPathAStar, MapTile } from './util';

const GRID_SIZE = 40;
const OBSTACLE_PROBABILITY = 0.2;
const INITIAL_SNAKE: Point[] = [
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
interface Point {
    x: number,
    y: number
}


/**
 * Create a 2D grid with tiles that may or may not be walkable
 * @param snake The snake represented by a 2D contiguous point array
 * @returns A 2D grid of Map tiles
 */
function createWalkableGrid(snake: Point[]) {
    return Array(GRID_SIZE).fill(null).map((_, y) =>
        Array(GRID_SIZE).fill(null).map((_, x) => {
            const isSnake = snake.some(p => p.x === x && p.y === y);
            const isObstacle = !isSnake && Math.random() < OBSTACLE_PROBABILITY;
            return { walkable: !isSnake && !isObstacle, x, y };
        })
    );
}


/**
 * Create a random target cell in the grid
 * @param snake The snake array
 * @returns The target cell in the grid
 */
function computeTargetPath(snake: Point[], grid: MapTile[][]) {
    let target: Point;
    let path: Point[] | null;
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
            return {target: snake[0], path: []};
        }
    } while (
        snake.some(p => p.x === target.x && p.y === target.y) ||
        !grid[target.y][target.x].walkable || 
        !path
    );

    return { target, path };
}



/**
 * Home component with website info and snake background (pathfinding)
 */
export default function Home() {
    // Initil snake position, grid, target, and path
    const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
    const [grid, _] = useState<MapTile[][]>(createWalkableGrid(snake))
    const [target, setTarget] = useState<Point>(computeTargetPath(snake, grid).target);

    // Calculate initial path ... slice(1) to not count snake head
    const initialPath = findPathAStar(grid, snake[0], target) ?? [];
    const [path, setPath] = useState<Point[]>(initialPath.slice(1));

    // Move the snake at regular intervals
    useEffect(() => {
        const interval = setInterval(() => {
            setSnake((prevSnake) => {
                if(path.length <= 0) return prevSnake;
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
            <h1>Exploring Terrain Generation and Pathfinding Algorithms</h1>
            <div style={{ display: 'flex', height: '75vh', color: 'white' }}>
                <div style={{ flex: 1 }}>
                    <h4>
                        This project explores different aspects of terrain creation and interaction
                        via various pathfinding algorithms.
                    </h4>
                </div>

                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                            width: '80%',
                            height: '80%',
                            border: '1px solid white'
                        }}
                    >
                        {/* Fill the grid, color cells appropriately */}
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
                                    style={{
                                        backgroundColor: color,
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}