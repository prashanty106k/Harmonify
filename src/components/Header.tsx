import React, { useState, useEffect } from 'react';
import { Menu, X, Download, Music } from 'lucide-react';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#121212]/90 backdrop-blur-md py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <Music className="h-8 w-8 text-purple-500" />
          <span className="ml-2 text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Harmonify
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8">
          <a href="#features" className="text-white hover:text-purple-400 transition-colors">
            Features
          </a>
          <a href="#library" className="text-white hover:text-purple-400 transition-colors">
            Library
          </a>
          <a href="#app" className="text-white hover:text-purple-400 transition-colors">
            App
          </a>
          <a href="href="https://play.google.com/sta.groovy&pcampaignid=web_share"" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full flex items-center hover:opacity-90 transition-opacity">
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </nav>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-[#121212] absolute top-full left-0 w-full">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <a 
              href="#features" 
              className="text-white hover:text-purple-400 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </a>
            <a 
              href="#library" 
              className="text-white hover:text-purple-400 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Library
            </a>
            <a 
              href="#app" 
              className="text-white hover:text-purple-400 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              App
            </a>
            <a 
              href="#download" 
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
              onClick={() => setIsOpen(false)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
