import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Room from './Room';

function App() {
  return (
    // BrowserRouter acts as the master wrapper that watches the URL bar
    <BrowserRouter>
      <Routes>
        
        {/* If the URL is exactly "localhost:5173/", display the Home screen */}
        <Route path="/" element={<Home />} />
        
        {/* If the URL is "localhost:5173/room/ANYTHING", display the Room screen.
            The ":roomID" part tells React to capture whatever random string is there 
            and save it as a variable named 'roomID' */}
        <Route path="/room/:roomID" element={<Room />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
