import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout as Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { MLInsights } from './pages/MLInsights';
import { Control } from './pages/Control';
import { Settings } from './pages/Settings';
import { SystemHealth } from './pages/SystemHealth';
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
          <Route path="/settings" element={<Settings />} />
          <Route path="/ml-insights" element={<MLInsights />} />
          <Route path="/control" element={<Control />} />
          <Route path="/system" element={<SystemHealth />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

