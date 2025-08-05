import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

export default function HomeLayout() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className={`app-layout ${collapsed ? "collapsed" : ""}`}>
            <aside className="sidebar">
                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
                </button>

                <nav>
                    <Link to="/" className={location.pathname === "/" ? "active" : ""}>
                        Home
                    </Link>
                    <Link to="/generation" className={location.pathname === "/generation" ? "active" : ""}>
                        2D Tile Map
                    </Link>
                </nav>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
