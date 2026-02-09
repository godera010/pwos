import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { PlaceholderPage } from './components/PlaceholderPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<PlaceholderPage title="Analytics" description="In-depth historical data and moisture trend analysis." />} />
          <Route path="/ml-insights" element={<PlaceholderPage title="ML Insights" description="VPD scoring and predictive model weights." />} />
          <Route path="/control" element={<PlaceholderPage title="Control Center" description="Manual overrides and hardware calibration." />} />
          <Route path="/system" element={<PlaceholderPage title="System Health" description="Node status, MQTT logs, and battery levels." />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
