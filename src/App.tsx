import "./style.css";
import { Routes, Route, Link } from 'react-router-dom';
import Home from './Home';
import AStar2D from './AStar2D';
import Sidebar from './Sidebar';
import DynamicTerrain from './DynamicTerrain';

export default function App() {
    return (
        <div className="app-container">
            <main>
                <Routes>
                    <Route path="/" element={<Sidebar />}>
                        <Route index element={<Home />} />
                        <Route path="a-star-2d" element={<AStar2D />} />
                        <Route path="dynamic-terrain" element={<DynamicTerrain />} />
                    </Route>
                </Routes>
            </main>
        </div>
    );
}