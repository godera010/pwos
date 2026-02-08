import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Hardware } from './pages/Hardware';
import { Terminal } from './pages/Terminal';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hardware" element={<Hardware />} />
          <Route path="/terminal" element={<Terminal />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
