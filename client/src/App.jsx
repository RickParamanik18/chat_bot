import "./App.css";
import Chat from "./pages/Chat.jsx";
import { Routes, Route } from "react-router-dom";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/:thread_id" element={<Chat />} />
        </Routes>
    );
}

export default App;
