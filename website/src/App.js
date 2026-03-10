import './App.css';

import Layout from './layout/Layout';
import {Fallback, HomePage, Account, Product, Configuration} from './pages';
import {Route, BrowserRouter as Router, Routes} from 'react-router-dom';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/account" element={<Account />} />
          <Route path="/config" element={<Configuration />} />
          <Route path="*" element={<Fallback />} />
        </Routes>
      </Layout>
    </Router>
  );
}
