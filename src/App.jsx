import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Room from './Room';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Home screen */}
        <Route path="/" element={<Home />} />

        {/* Room screen */}
        <Route path="/room/:roomID" element={<Room />} />

        {/* Catch-all route to prevent blank screens on unknown paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
