import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { MLInsights } from './pages/MLInsights';
import { Control } from './pages/Control';
import { Settings } from './pages/Settings';
import { PlaceholderPage } from './components/PlaceholderPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ml-insights" element={<MLInsights />} />
          <Route path="/control" element={<Control />} />
          <Route path="/system" element={<PlaceholderPage title="System Health" description="Node status, MQTT logs, and battery levels." />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
