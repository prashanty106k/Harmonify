import React from 'react';
import { Download } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden bg-gradient-to-b from-[#121212] to-[#1E1E2F]">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="sound-wave"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 text-center md:text-left mb-10 md:mb-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                Harmonify
              </span>
              <br />
              <span className="text-white">Music Player</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-lg mx-auto md:mx-0">
              Experience music like never before with gorgeous equalizer, all formats support, and a stylish UI for the best musical experience.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.nova.groovy&pcampaignid=web_share"
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                <Download className="h-5 w-5 mr-2" />
                Download Now
              </a>
              <a
                href="#features"
                className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full hover:bg-white/20 transition-colors w-full sm:w-auto"
              >
                Explore Features
              </a>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-64 md:w-80 h-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur opacity-75"></div>
              <div className="relative bg-[#1A1A2E] rounded-3xl p-2 shadow-xl">
                <img
                  src="https://images.pexels.com/photos/3394651/pexels-photo-3394651.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                  alt="Harmonify Music Player App"
                  className="rounded-2xl w-full h-auto shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
