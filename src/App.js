import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';
import Navbar from './components/Navbar';
import Home from './components/Home';
import ImageConverter from './components/ImageConverter';
import Resizer from './components/Resizer';
import Cropper from './components/Cropper';
import Compressor from './components/Compressor';
import Terms from './components/Terms';
import About from './components/About';
import Footer from './components/Footer';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/convert" element={<ImageConverter />} />
            <Route path="/resize" element={<Resizer />} />
            <Route path="/crop" element={<Cropper />} />
            <Route path="/compress" element={<Compressor />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

