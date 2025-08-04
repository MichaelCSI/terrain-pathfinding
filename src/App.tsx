import { Routes, Route, Link } from 'react-router-dom';
import Home from './Home';
import About from './About';
import Generation from './Generation';
import Sidebar from './Sidebar';
import "./style.css";

export default function App() {
    return (
        <div className="app-container">
            <main>
                <Routes>
                    <Route path="/" element={<Sidebar />}>
                        <Route index element={<Home />} />
                        <Route path="about" element={<About />} />
                        <Route path="generation" element={<Generation />} />
                    </Route>
                </Routes>
            </main>
        </div>
    );
}