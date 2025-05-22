import React from 'react';
import { Download, Music, ChevronRight } from 'lucide-react';

const DownloadSection: React.FC = () => {
  return (
    <section id="download" className="py-20 bg-gradient-to-b from-[#1E1E2F] to-[#121212]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Ready to Experience <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">Harmonify</span>?
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Download Harmonify Music Player now and transform your musical experience with enhanced sound quality, all format support, and a beautiful interface.
          </p>
          
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-center mb-8">
              <Music className="h-12 w-12 text-purple-500" />
              <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                Harmonify Music Player
              </span>
            </div>
            
            <div className="flex flex-col items-center">
              <a
                href="#"
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity w-full sm:w-auto mb-4"
              >
                <Download className="h-5 w-5 mr-2" />
                Download on Google Play
              </a>
              <p className="text-gray-400 text-sm">
                Available for Android devices
              </p>
            </div>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#16162A] rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Free Download</div>
              <p className="text-gray-400">No cost to get started</p>
            </div>
            <div className="bg-[#16162A] rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Small Size</div>
              <p className="text-gray-400">Lightweight app installation</p>
            </div>
            <div className="bg-[#16162A] rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">Regular Updates</div>
              <p className="text-gray-400">New features & improvements</p>
            </div>
          </div>
          
          <div className="mt-16">
            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center">
              Learn more about Harmonify
              <ChevronRight className="h-4 w-4 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadSection;