import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Level1Module from './modules/level1/Level1Module';
import Level2Module from './modules/level2/Level2Module';
import Level3Module from './modules/level3/Level3Module';
import Level4Module from './modules/level4/Level4Module';
import './index.css';

export default function App() {
  return (
    <div className="unified-platform-container">
      <Header />
      <main className="platform-content">
        <Routes>
          <Route path="/" element={<Navigate to="/prediction" replace />} />
          <Route path="/prediction/*" element={<Level1Module />} />
          <Route path="/surveillance/*" element={<Level2Module />} />
          <Route path="/gene-detection/*" element={<Level3Module />} />
          <Route path="/forecasting/*" element={<Level4Module />} />
          <Route path="*" element={<Navigate to="/prediction" replace />} />
        </Routes>
      </main>
    </div>
  );
}
