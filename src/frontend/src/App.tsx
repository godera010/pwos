import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout as Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { MLInsights } from './pages/MLInsights';
import { CropSettings } from './pages/CropSettings';
import { Control } from './pages/Control';
import { SystemHealth } from './pages/SystemHealth';
import { MLAudit } from './pages/MLAudit';
import { ModelRegistry } from './pages/ModelRegistry';
import { IrrigationEfficiency } from './pages/IrrigationEfficiency';
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'inherit' },
          duration: 4000,
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Control />} />
          <Route path="/ml-insights" element={<MLInsights />} />
          <Route path="/crop-settings" element={<CropSettings />} />
          <Route path="/control" element={<Control />} />
          <Route path="/system" element={<SystemHealth />} />
          <Route path="/ml-audit" element={<MLAudit />} />
          <Route path="/model-registry" element={<ModelRegistry />} />
          <Route path="/irrigation-efficiency" element={<IrrigationEfficiency />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

