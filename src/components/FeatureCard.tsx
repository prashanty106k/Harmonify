import React, { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
  return (
    <div 
      className="bg-[#16162A] rounded-xl p-6 shadow-lg transition-transform duration-300 hover:-translate-y-2"
      data-aos="fade-up"
      data-aos-delay={100 * index}
    >
      <div className="flex items-start">
        <div className="rounded-full p-3 bg-[#1E1E36] mb-4">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

export default FeatureCard;