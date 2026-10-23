import { BrowserRouter, Routes, Route } from "react-router-dom";
import UploadResume from "./pages/UploadResume";
import CreateJob from "./pages/CreateJob";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/upload" element={<UploadResume />} />
        <Route path="/job" element={<CreateJob />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;