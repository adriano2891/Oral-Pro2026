import React, { useState } from 'react';

export const ORALPRO_LOGO_URL = '/images/oralpro-logo.png';
export const ORALPRO_REMOTE_LOGO_URL = 'https://i.ibb.co/zW4LH4ZY/Design-sem-nome.png';

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
  // The logo has natural ~3.47:1 proportion (1021x294), ensuring crisp sharpness across all devices.
  const heightClass = {
    xs: 'h-6 sm:h-7 max-w-[130px]',
    sm: 'h-7 sm:h-8 max-w-[160px]',
    md: 'h-8.5 sm:h-9.5 lg:h-10.5 max-w-[200px]',
    header: 'h-9 sm:h-10.5 lg:h-12 xl:h-13 max-w-[190px] sm:max-w-[220px] lg:max-w-[260px]',
    lg: 'h-11 sm:h-13 lg:h-15 max-w-[300px]',
    xl: 'h-15 sm:h-18 lg:h-22 max-w-[380px]',
  }[size] || 'h-9 sm:h-10.5 lg:h-12 xl:h-13 max-w-[190px] sm:max-w-[220px] lg:max-w-[260px]';

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
  // matching the dark header specification while preserving transparent PNG rendering
  if (light || showBackground) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-xs border border-white/20 select-none shrink-0 ${className}`}
      >
        {logoImage}
      </div>
    );
  }

  // Pure transparent background (e.g. Navbar on public site)
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
