import React, { useState } from 'react';

export const ORALPRO_LOGO_URL = '/images/oralpro-logo.png';
export const ORALPRO_REMOTE_LOGO_URL = 'https://i.ibb.co/MDpzrTVH/chatgpt-7.png';

export interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'header' | 'lg' | 'xl';
  showText?: boolean;
  light?: boolean;
  showBackground?: boolean;
}

export const OralProLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'header',
  light = false,
  showBackground = false,
}) => {
  const [imgSrc, setImgSrc] = useState(ORALPRO_LOGO_URL);

  // Height configurations tuned for optimal horizontal balance with pure transparent background
  const heightClass = {
    xs: 'h-6 sm:h-7',
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11 lg:h-12',
    header: 'h-9 sm:h-10.5 lg:h-12.5 xl:h-14',
    lg: 'h-13 sm:h-15 lg:h-18',
    xl: 'h-18 sm:h-22 lg:h-26',
  }[size] || 'h-9 sm:h-10.5 lg:h-12.5 xl:h-14';

  const logoImage = (
    <img
      src={imgSrc}
      alt="OralPro - Marketing Dentário"
      className={`${heightClass} w-auto object-contain select-none transition-transform duration-200 group-hover:scale-[1.02] shrink-0 bg-transparent`}
      onError={() => {
        if (imgSrc !== ORALPRO_REMOTE_LOGO_URL) {
          setImgSrc(ORALPRO_REMOTE_LOGO_URL);
        }
      }}
      loading="eager"
      decoding="async"
    />
  );

  // If used on a dark background (light = true), provide a crisp white badge for legibility
  if (light || showBackground) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white px-2.5 py-1 rounded-xl shadow-xs border border-white/20 select-none shrink-0 ${className}`}
      >
        {logoImage}
      </div>
    );
  }

  // Pure transparent background (e.g. Navbar)
  return (
    <div className={`inline-flex items-center shrink-0 select-none bg-transparent ${className}`}>
      {logoImage}
    </div>
  );
};

export interface EmblemProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'header' | 'lg' | 'xl';
  showBackground?: boolean;
  light?: boolean;
}

export const OralProEmblem: React.FC<EmblemProps> = ({
  className = '',
  size = 'md',
  light = false,
  showBackground = false,
}) => {
  return (
    <OralProLogo
      size={size}
      light={light}
      showBackground={showBackground}
      className={className}
    />
  );
};


