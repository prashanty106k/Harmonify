import React from 'react';
import { Music, Mic, Headphones, Music2, Disc, Radio } from 'lucide-react';
import FeatureCard from './FeatureCard';

const Features: React.FC = () => {
  const features = [
    {
      icon: <Headphones className="h-10 w-10 text-purple-500" />,
      title: "Enhanced Equalizer",
      description: "Experience music with bass boost, reverb effects and a built-in equalizer that enhances your listening experience."
    },
    {
      icon: <Music2 className="h-10 w-10 text-blue-500" />,
      title: "All Format Support",
      description: "Support for all music and audio formats including MP3, MIDI, WAV, FLAC, AAC, APE, and more with high-quality playback."
    },
    {
      icon: <Disc className="h-10 w-10 text-purple-500" />,
      title: "Stylish Interface",
      description: "Enjoy your music with a stylish and simple user interface that makes navigation and music discovery a breeze."
    },
    {
      icon: <Radio className="h-10 w-10 text-blue-500" />,
      title: "Offline Listening",
      description: "Download and listen to your favorite tracks offline, anywhere and anytime without requiring an internet connection."
    },
    {
      icon: <Mic className="h-10 w-10 text-purple-500" />,
      title: "Podcast Support",
      description: "Discover and listen to over 5 million podcasts, bookmark episodes, and create your own podcast library."
    },
    {
      icon: <Music className="h-10 w-10 text-blue-500" />,
      title: "Lyrics & Playlists",
      description: "Sing along with synchronized lyrics and create personalized playlists to suit your mood or discover new ones."
    }
  ];

  return (
    <section id="features" className="py-20 bg-[#0A0A15]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Harmonify comes packed with all the features you need for the perfect music experience on your Android device.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;