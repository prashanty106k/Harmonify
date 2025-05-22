import React, { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Library from './components/Library';
import AppShowcase from './components/AppShowcase';
import Download from './components/Download';
import Footer from './components/Footer';

function App() {
  useEffect(() => {
    // Update page title
    document.title = 'Harmonify Music Player - The Ultimate Music Experience';
    
    // Add meta description
    const metaDescription = document.createElement('meta');
    metaDescription.name = 'description';
    metaDescription.content = 'Harmonify Music Player is the best music player for Android with equalizer, all formats support, and stylish UI for the ultimate musical experience.';
    document.head.appendChild(metaDescription);
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Header />
      <main>
        <Hero />
        <Features />
        <Library />
        <AppShowcase />
        <Download />
      </main>
      <Footer />
    </div>
  );
}

export default App;