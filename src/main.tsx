import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// Launch the app with routing
ReactDOM.createRoot(document.getElementById('app')!).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
