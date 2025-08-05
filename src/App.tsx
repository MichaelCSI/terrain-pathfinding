import { Routes, Route, Link } from 'react-router-dom';
import Home from './Home';
import Generation from './Map';
import Sidebar from './Sidebar';
import "./style.css";

export default function App() {
    return (
        <div className="app-container">
            <main>
                <Routes>
                    <Route path="/" element={<Sidebar />}>
                        <Route index element={<Home />} />
                        <Route path="generation" element={<Generation />} />
                    </Route>
                </Routes>
            </main>
        </div>
    );
}