import React from 'react';
import { Music, Headphones, BookOpen } from 'lucide-react';

const Library: React.FC = () => {
  const stats = [
    { icon: <Music className="h-6 w-6 text-purple-500" />, value: "100M+", label: "Songs" },
    { icon: <Headphones className="h-6 w-6 text-blue-500" />, value: "5M+", label: "Podcasts" },
    { icon: <BookOpen className="h-6 w-6 text-purple-500" />, value: "300K+", label: "Audiobooks" }
  ];

  return (
    <section id="library" className="py-20 bg-gradient-to-b from-[#0A0A15] to-[#1E1E2F]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Vast Music Library
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Access millions of songs, podcasts, and audiobooks in one place. Discover new music or listen to your favorites.
          </p>
        </div>

        <div className="flex flex-wrap justify-center mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="w-full sm:w-1/3 p-4 text-center">
              <div className="bg-[#16162A] rounded-xl p-6 shadow-lg h-full">
                <div className="flex justify-center mb-4">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center bg-[#16162A] rounded-xl overflow-hidden shadow-xl">
          <div className="md:w-1/2 p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Discover Podcasts & Audiobooks
            </h3>
            <p className="text-gray-400 mb-6">
              Listen to popular and exclusive podcasts like The Joe Rogan Experience, Modern Wisdom, and Crime Junkie. Get lost in great audiobook stories with easy access across all your devices.
            </p>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-purple-500 mr-3"></span>
                Subscribe to your favorite podcasts
              </li>
              <li className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-3"></span>
                Bookmark episodes into playlists
              </li>
              <li className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-purple-500 mr-3"></span>
                Switch between music, podcasts, and audiobooks
              </li>
              <li className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-blue-500 mr-3"></span>
                Discover new content personalized for you
              </li>
            </ul>
          </div>
          <div className="md:w-1/2">
            <img 
              src="https://images.pexels.com/photos/3756766/pexels-photo-3756766.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
              alt="Podcast and Audiobooks" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Library;