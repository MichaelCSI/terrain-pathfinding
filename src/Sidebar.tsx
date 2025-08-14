import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

export default function HomeLayout() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`flex ${collapsed ? "collapsed" : ""}`}>
            <aside
                className={`
                    fixed top-0 bottom-0
                    transition-all duration-300 ease-in-out 
                    flex flex-col gap-5 
                    ${collapsed ? "w-20 px-2" : "w-52 px-4"} 
                    bg-[var(--color-menu-bg)] py-6
                `}
            >
                <button
                    className={`
                        default absolute top-3 right-2
                        text-[var(--color-secondary)] bg-transparent 
                        hover:bg-transparent hover:scale-110 hover:text-[var(--color-secondary-faded)]
                    `}
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
                </button>

                {/* Navigation links */}
                <nav
                    className={`flex flex-col gap-5 mt-12 ${collapsed ? "hidden" : "flex"}`}
                >
                    <Link
                        to="/"
                        className={`no-underline font-semibold px-3 py-2 rounded-md transition-colors duration-200 
                        text-[var(--color-secondary)] hover:bg-[var(--color-primary)]
                        ${location.pathname === "/" ? "bg-[var(--color-primary)]" : ""}`}
                    >
                        Home
                    </Link>
                    <Link
                        to="/generation"
                        className={`no-underline font-semibold px-3 py-2 rounded-md transition-colors duration-200 
                        text-[var(--color-secondary)] hover:bg-[var(--color-primary)]
                        ${location.pathname === "/generation" ? "bg-[var(--color-primary)]" : ""}`}
                    >
                        2D A* pathfinding
                    </Link>
                </nav>
            </aside>

            <main className={`
                flex-1 p-6 
                ${collapsed ? "ml-20" : "ml-52"}
                transition-all duration-300 ease-in-out 
            `}>
                <Outlet />
            </main>
        </div>
    );
}
