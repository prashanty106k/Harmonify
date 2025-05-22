import React from 'react';
import { Check } from 'lucide-react';

const AppShowcase: React.FC = () => {
  const features = [
    "Listen to over 100 million songs and 5 million podcasts",
    "Create and share your own music playlists",
    "Enjoy amazing sound quality across all devices",
    "Discover daily music mixes made just for you",
    "Explore top songs from different genres",
    "Sing along with synchronized lyrics",
    "Listen to music offline, anytime and anywhere"
  ];

  return (
    <section id="app" className="py-20 bg-[#0A0A15]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-12 md:mb-0 md:pr-12 order-2 md:order-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Why Choose Harmonify?
            </h2>
            <p className="text-gray-400 mb-8">
              Harmonify music player gives you access to a world of music, curated playlists, artists, and podcasts you love. Discover new music, create personalized playlists, and enjoy an unparalleled listening experience.
            </p>
            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="ml-3 text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:w-1/2 flex justify-center order-1 md:order-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur opacity-75"></div>
              <div className="phone-mockup relative bg-[#1A1A2E] rounded-3xl p-3 shadow-xl">
                <img
                  src="https://images.pexels.com/photos/1337753/pexels-photo-1337753.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                  alt="Harmonify App Interface"
                  className="rounded-2xl w-full h-auto"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-white/10 rounded-full backdrop-blur-md flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <div className="ml-3">
                      <div className="h-2 w-24 bg-white/30 rounded-full"></div>
                      <div className="h-2 w-16 bg-white/20 rounded-full mt-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;