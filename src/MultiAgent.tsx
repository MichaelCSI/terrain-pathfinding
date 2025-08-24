import { useEffect, useMemo, useRef, useState } from "react";
import {
    assignTilePerlinOverlay,
    generatePerlinMap,
    MapTile,
    NoiseLayer,
    Point2D,
} from "./util/grid2DUtil";
import { createNoise2D } from "simplex-noise";

/**
 * Multi-agent pathfinding demo using prioritized planning with a reservation table (space–time A*).
 */

const WIDTH = 64;
const HEIGHT = 64;
const TILE_SIZE = 8;


type Agent = {
    id: number;
    start: Point2D | null;
    goal: Point2D | null;
    path: Point2D[]; // planned path
    color: string;
};

type SpaceTimeNode = {
    x: number;
    y: number;
    t: number; // timestep
    g: number; // cost from start
    f: number; // g + h
    parent?: SpaceTimeNode;
};

// Reservation tables for vertex and edge collisions
// vertexReservations.get(t) -> Set("x,y")
// edgeReservations.get(t) -> Set("x1,y1>x2,y2") representing a move occupying the directed edge at time t->t+1

type Reservations = {
    vertex: Map<number, Set<string>>;
    edge: Map<number, Set<string>>;
    // when an agent reaches its goal at time tg, we reserve the goal for [tg, horizon]
};

// Utility functions

const keyXY = (x: number, y: number) => `${x},${y}`;
const keyEdge = (ax: number, ay: number, bx: number, by: number) => `${ax},${ay}>${bx},${by}`;

const manhattan = (a: Point2D, b: Point2D) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function isWalkable(tile: MapTile) {
    return tile.tileType && tile.tileType !== "Water" && tile.tileType !== "Stone";
}

function neighbors4(x: number, y: number, w: number, h: number): Point2D[] {
    const out: Point2D[] = [];
    if (x > 0) out.push({ x: x - 1, y });
    if (x < w - 1) out.push({ x: x + 1, y });
    if (y > 0) out.push({ x, y: y - 1 });
    if (y < h - 1) out.push({ x, y: y + 1 });
    return out;
}

function cloneReservations(): Reservations {
    return { vertex: new Map(), edge: new Map() };
}

function reserveVertex(res: Reservations, t: number, x: number, y: number) {
    const set = res.vertex.get(t) ?? new Set<string>();
    set.add(keyXY(x, y));
    res.vertex.set(t, set);
}

function reserveEdge(res: Reservations, t: number, ax: number, ay: number, bx: number, by: number) {
    const set = res.edge.get(t) ?? new Set<string>();
    set.add(keyEdge(ax, ay, bx, by));
    res.edge.set(t, set);
}

function isReserved(res: Reservations, t: number, x: number, y: number) {
    return res.vertex.get(t)?.has(keyXY(x, y)) ?? false;
}

function isEdgeReserved(res: Reservations, t: number, ax: number, ay: number, bx: number, by: number) {
    return res.edge.get(t)?.has(keyEdge(ax, ay, bx, by)) ?? false;
}

// Space–time A* with reservations
function planPathWithReservations(
    map: MapTile[][],
    start: Point2D,
    goal: Point2D,
    baseReservations: Reservations,
    horizon: number
): Point2D[] | null {
    const w = map[0].length;
    const h = map.length;

    const open: SpaceTimeNode[] = [];
    const openKey = new Map<string, SpaceTimeNode>();
    const closed = new Set<string>();

    function push(node: SpaceTimeNode) {
        open.push(node);
        openKey.set(`${node.x},${node.y},${node.t}`, node);
        // simple insertion sort by f (small queues typical here)
        open.sort((a, b) => a.f - b.f || b.g - a.g);
    }

    function pop(): SpaceTimeNode | undefined {
        const n = open.shift();
        if (n) openKey.delete(`${n.x},${n.y},${n.t}`);
        return n;
    }

    const h0 = manhattan(start, goal);
    push({ x: start.x, y: start.y, t: 0, g: 0, f: h0 });

    while (open.length) {
        const cur = pop()!;
        const ck = `${cur.x},${cur.y},${cur.t}`;
        if (closed.has(ck)) continue;
        closed.add(ck);

        // goal reached: allow arrival anytime <= horizon
        if (cur.x === goal.x && cur.y === goal.y) {
            // Reconstruct space–time path and then flatten to positions per time step
            const timeline: SpaceTimeNode[] = [];
            let p: SpaceTimeNode | undefined = cur;
            while (p) {
                timeline.push(p);
                p = p.parent;
            }
            timeline.reverse();

            // Extend by waiting at goal to horizon to keep it occupied
            const path: Point2D[] = timeline.map((n) => ({ x: n.x, y: n.y }));
            const last = { x: goal.x, y: goal.y };
            while (path.length <= horizon) path.push(last);
            return path;
        }

        const tNext = cur.t + 1;
        if (tNext > horizon) {
            // give up if we ran out of horizon
            continue;
        }

        // Consider WAIT in place
        const waitOK =
            !isReserved(baseReservations, tNext, cur.x, cur.y) && isWalkable(map[cur.y][cur.x]);
        if (waitOK) {
            const g = cur.g + 1;
            const hCost = manhattan({ x: cur.x, y: cur.y }, goal);
            const node: SpaceTimeNode = { x: cur.x, y: cur.y, t: tNext, g, f: g + hCost, parent: cur };
            const k = `${node.x},${node.y},${node.t}`;
            if (!closed.has(k) && !openKey.has(k)) push(node);
        }

        // Consider 4-neighbors
        for (const nb of neighbors4(cur.x, cur.y, w, h)) {
            if (!isWalkable(map[nb.y][nb.x])) continue;
            // vertex reservation at next time
            if (isReserved(baseReservations, tNext, nb.x, nb.y)) continue;
            // edge conflict (someone else moving opposite direction at same time)
            if (isEdgeReserved(baseReservations, cur.t, nb.x, nb.y, cur.x, cur.y)) continue;

            const g = cur.g + 1;
            const hCost = manhattan(nb, goal);
            const node: SpaceTimeNode = { x: nb.x, y: nb.y, t: tNext, g, f: g + hCost, parent: cur };
            const k = `${node.x},${node.y},${node.t}`;
            if (!closed.has(k) && !openKey.has(k)) push(node);
        }
    }

    return null;
}

function buildReservationsFromPaths(paths: Point2D[][]): Reservations {
    const res = cloneReservations();
    const horizon = Math.max(0, ...paths.map((p) => p.length - 1));

    for (const path of paths) {
        for (let t = 0; t < path.length; t++) {
            const pos = path[t];
            // vertex at time t
            reserveVertex(res, t, pos.x, pos.y);
            if (t < path.length - 1) {
                const next = path[t + 1];
                reserveEdge(res, t, pos.x, pos.y, next.x, next.y);
            }
            // keep reserving the final position for the rest of the horizon
            if (t === path.length - 1) {
                for (let u = t + 1; u <= horizon; u++) reserveVertex(res, u, pos.x, pos.y);
            }
        }
    }
    return res;
}

const colorClasses = [
    "red-500",
    "green-500",
    "blue-500",
    "yellow-500",
    "purple-500",
    "pink-500",
    "orange-500",
    "cyan-500",
    "emerald-500",
    "rose-500",
];
const colorMap: Record<string, string> = {
    "red-500": "bg-red-500",
    "green-500": "bg-green-500",
    "blue-500": "bg-blue-500",
    "yellow-500": "bg-yellow-500",
    "purple-500": "bg-purple-500",
    "pink-500": "bg-pink-500",
    "orange-500": "bg-orange-500",
    "cyan-500": "bg-cyan-500",
    "emerald-500": "bg-emerald-500",
    "rose-500": "bg-rose-500",
};
function getColorByIndex(index: number) {
    return colorClasses[index % colorClasses.length];
}

export default function MultiAgent() {
    // Map generation (Perlin-based like your original component)
    const [noiseLayers, setNoiseLayers] = useState<NoiseLayer[]>(() => [
        { noise: createNoise2D(), scale: 10, factor: 1 },
    ]);
    const [map, setMap] = useState<MapTile[][]>([]);

    // Agents
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectingAgents, setSelectingAgents] = useState<null | { mode: "start" | "goal"; agentId: number }>(
        null
    );

    // Planning & animation
    const [planned, setPlanned] = useState(false);
    const [planningFailedFor, setPlanningFailedFor] = useState<number[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeStep, setTimeStep] = useState(0);
    const playTimer = useRef<NodeJS.Timeout | null>(null);

    // Horizon auto-chooses based on heuristic upper bound (grid diameter * 2)
    const HORIZON = useMemo(() => WIDTH + HEIGHT, []);

    // Generate Perlin map on load/reset
    useEffect(() => {
        const perlinMap = generatePerlinMap(HEIGHT, WIDTH, noiseLayers, 0, 0.8);
        setMap(perlinMap);
        // wiping state tied to map
        pause();
        setAgents([]);
        setPlanned(false);
        setPlanningFailedFor([]);
        setTimeStep(0);
    }, [noiseLayers]);

    function pause() {
        setIsPlaying(false);
        if (playTimer.current) {
            clearInterval(playTimer.current);
            playTimer.current = null;
        }
    }

    function onAddAgent() {
        pause();
        const id = (agents.at(-1)?.id ?? 0) + 1;
        const color = getColorByIndex(id - 1);
        setAgents((prev) => [
          ...prev,
          { id, start: null, goal: null, path: [], color },
        ]);
        setSelectingAgents({ mode: "start", agentId: id });
        setPlanned(false);
        setPlanningFailedFor([]);
      }
      

    function onClickTile(x: number, y: number) {
        if (!selectingAgents) {
            console.log("Not in selecting state");
            return;
        }
        const tile = map[y][x];
        if (!tile || !isWalkable(tile)) {
            console.log("Invalid tile");
            return;
        }

        setAgents((prev) => {
            const next = prev.map((a) => ({ ...a }));
            const idx = next.findIndex((a) => a.id === selectingAgents.agentId);
            if (idx === -1) return prev;
            if (selectingAgents.mode === "start") {
                next[idx].start = { x, y };
                setSelectingAgents({ mode: "goal", agentId: selectingAgents.agentId });
            } else {
                next[idx].goal = { x, y };
                setSelectingAgents(null);
            }
            return next;
        });
    }

    function play() {
        setPlanned(false);
        setPlanningFailedFor([]);

        // Prioritized by insertion order
        const plannedPaths: Point2D[][] = [];
        const failed: number[] = [];

        // Build base reservations from nothing
        let reservations: Reservations = cloneReservations();

        for (const a of agents) {
            if (!a.start || !a.goal) {
                failed.push(a.id);
                continue;
            }
            const path = planPathWithReservations(map, a.start, a.goal, reservations, HORIZON);
            if (!path) {
                failed.push(a.id);
            } else {
                plannedPaths.push(path);
                // merge this path into reservations for subsequent agents
                reservations = buildReservationsFromPaths(plannedPaths);
            }
        }

        // commit results
        const newAgents = agents.map((agent, i) => ({ ...agent, path: plannedPaths[i] }));
        setAgents(newAgents);
        setPlanned(true);
        setPlanningFailedFor(failed);
        setTimeStep(0);

        setIsPlaying(true);
        if (playTimer.current) clearInterval(playTimer.current);
        playTimer.current = setInterval(() => {
            setTimeStep((t) => t + 1);
        }, 120);
    }

    function resetAgents() {
        pause();
        setAgents([]);
        setPlanned(false);
        setPlanningFailedFor([]);
        setTimeStep(0);
        setSelectingAgents(null);
    }

    // Ensure timeStep stays within all paths’ horizons
    useEffect(() => {
        if (!planned) return;
        const maxLen = Math.max(0, ...agents.map((a) => a.path.length));
        if (timeStep >= maxLen) pause();
    }, [timeStep, planned, agents]);



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
                {/* Agent overlay layer */}
                <div
                    className="absolute grid z-20 pointer-events-none"
                    style={{ gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)` }}
                >
                    {agents.length > 0 && map.flat().map((tile) => {
                        const { x, y } = tile.gridCoordinates;

                        // Find whether an agent occupies this tile at the current timestep
                        console.log(agents)
                        const agentPath = agents.find((a) => a.path[timeStep] && a.path[timeStep].x === x && a.path[timeStep].y === y);
                        const agentStartPoint = agents.find((a) => a.start?.x === x && a.start?.y === y);
                        const agentGoalPoint = agents.find((a) => a.goal?.x === x && a.goal?.y === y);

                        // Also lightly show planned paths when paused
                        const onPlannedPath = !isPlaying && agents.some((a) => a.path.some((p) => p.x === x && p.y === y));
                        let bgColor = 'bg-transparent';
                        let bgText = '';
                        if (agentStartPoint) {
                            bgColor = colorMap[agentStartPoint.color];
                            bgText = `Agent ${agents.indexOf(agentStartPoint) + 1} \n\n Start: (${x},${y})`;
                        } else if (agentGoalPoint) {
                            bgColor = colorMap[agentGoalPoint.color];
                            bgText = `Agent ${agents.indexOf(agentGoalPoint) + 1} \n\n Goal: (${x},${y})`;
                        }
                        else if (agentPath) {
                            bgColor = colorMap[agentPath.color];
                        } else if (onPlannedPath) {
                            bgColor = `bg-gray-800 bg-opacity-20`
                        }

                        return (
                            <div
                                key={`agentPath-${x}-${y}`}
                                className={`relative flex items-center justify-center ${bgColor}`}
                                style={{ width: TILE_SIZE, height: TILE_SIZE, fontSize: TILE_SIZE }}
                            >
                                <span className="select-none text-white leading-tight text-center whitespace-pre z-100">
                                    {bgText}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Base perlin / terrain layer */}
                <div
                    className="absolute grid z-10"
                    style={{ gridTemplateColumns: `repeat(${WIDTH}, ${TILE_SIZE}px)` }}
                >
                    {map.flat().map((tile) => (
                        <div
                            key={`base-${tile.gridCoordinates.x}-${tile.gridCoordinates.y}`}
                            onClick={() => onClickTile(tile.gridCoordinates.x, tile.gridCoordinates.y)}
                            className="border border-[rgba(17,17,17,0.1)] box-border"
                            style={{
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                backgroundColor: assignTilePerlinOverlay(tile.tileType!),
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-2">Multi-Agent Pathfinding (Prioritized + Space-Time A*)</h1>
            <p className="mb-4">Agents avoid tile collisions and head-on swaps via a reservation table.</p>

            <div className="flex flex-col md:flex-row gap-6">
                <div>{renderMap()}</div>


                {/* Controls */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg">Instructions</h2>
                    <ol className="list-decimal ml-5 space-y-1">
                        <li>Click "Add Agent", then click a walkable tile for the start and end points</li>
                        <li>Repeat to add more agents.</li>
                        <li>Control the animation with "Play" (start routes) and "Pause"</li>
                    </ol>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={onAddAgent}
                            className="px-3 py-2 rounded-2xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 basis-1/3"
                            disabled={selectingAgents ? true : false}
                        >
                            Add Agent
                        </button>
                        {isPlaying ? (
                            <button onClick={pause} className="px-3 py-2 rounded-2xl bg-yellow-600 text-white hover:bg-yellow-700 shadow disabled:opacity-50 basis-1/3">
                                Pause
                            </button>
                        ) : (
                            <button onClick={play} className="px-3 py-2 rounded-2xl bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50 basis-1/3"
                                // Disabled for no agents or if still in selecting phase for agent points
                                disabled={agents.length <= 0 || selectingAgents != null}>
                                Play
                            </button>
                        )}
                        <button
                            onClick={resetAgents}
                            className="px-3 py-2 rounded-2xl bg-gray-600 text-white hover:bg-gray-700 basis-1/3"
                        >
                            Reset Agents
                        </button>
                        <button
                            onClick={() => setNoiseLayers([{ noise: createNoise2D(), scale: noiseLayers[0].scale, factor: noiseLayers[0].factor }])}
                            className="px-3 py-2 rounded-2xl bg-green-600 text-white hover:bg-green-800 basis-1/3"
                        >
                            Regenerate Map
                        </button>
                    </div>

                    <div className="rounded-2xl space-y-2">
                        <p className="font-semibold">Status</p>
                        <p>
                            Selecting: {selectingAgents ? `Agent ${selectingAgents.agentId}: ${selectingAgents.mode.toUpperCase()}` : 'None'}
                        </p>
                        {planningFailedFor.length > 0 && (
                            <p className="text-red-600 text-sm">Failed to plan for agent IDs: {planningFailedFor.join(", ")}</p>
                        )}
                        {planned && (
                            <p className="text-sm">Time: t = {timeStep}</p>
                        )}
                    </div>

                    <p className="font-semibold">Agents</p>
                    <div className="space-y-2">
                        {agents.length === 0 && <p className="text-sm text-gray-500">No agents yet.</p>}
                        {agents.map((agent) => {
                            return (
                                <div key={agent.id} className="flex items-center justify-between gap-2 text-sm bg-white rounded-xl p-2 shadow">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block w-3 h-3 rounded-full ${colorMap[agent.color]}`}></span>
                                        <span className="font-medium">Agent {agent.id}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                        <span className="text-gray-500">Start</span>
                                        <span>{agent.start ? `(${agent.start.x}, ${agent.start.y})` : "—"}</span>
                                        <span className="text-gray-500">Goal</span>
                                        <span>{agent.goal ? `(${agent.goal.x}, ${agent.goal.y})` : "—"}</span>
                                    </div>
                                </div>)
                        }
                        )}
                    </div>
                </div>
            </div>
            <p className="mt-8 text-xl">Multi-Agent Pathfinding</p>
            <hr className="text-gray-300 my-2"></hr>
            <p>
                Paths are planned in priority order. Each planned path reserves its tiles over time (including a
                directed edge for moves) so later agents running space-time A* avoid both vertex conflicts and
                head-on swaps. Agents are allowed to wait in place. The goal tile is reserved after arrival
                to prevent squatting conflicts.
            </p>
        </div>
    );
}
