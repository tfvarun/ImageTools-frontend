import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-center">
          <span className="footer-copy">© 2025 ImageTools. All rights reserved.</span>
          <Link to="/terms" className="footer-link">Terms of Use</Link>
          <Link to="/about" className="footer-link">About Us</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
