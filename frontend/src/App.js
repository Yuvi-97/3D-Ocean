import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard/Dashboard";
import Explorer from "./components/Explorer/Explorer";
import Observations from "./components/Observations/Observations";
import ModelObservation from "./components/ModelObservation/ModelObservation";
import Alerts from "./components/Alerts/Alerts";
import Analytics from "./components/Analytics/Analytics";
import DataCatalog from "./components/DataCatalog/DataCatalog";
import About from "./components/About/About";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/comparison" element={<ModelObservation />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/data" element={<DataCatalog />} />
        <Route path="/about" element={<About />} />
        {/* Legacy route aliases for backward compatibility */}
        <Route path="/simulation" element={<Explorer />} />
        <Route path="/scada" element={<Observations />} />
        <Route path="/predictions" element={<ModelObservation />} />
        <Route path="/anomalies" element={<Alerts />} />
        <Route path="/reports" element={<Analytics />} />
        <Route path="/assets" element={<DataCatalog />} />
      </Routes>
    </Router>
  );
}

export default App;
