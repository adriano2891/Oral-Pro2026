import React, { useState, useEffect } from 'react';
import { useSiteContent } from '../context/SiteContentContext';

export const ORALPRO_LOGO_URL = 'https://i.ibb.co/vx8MfgHj/Design-sem-nome-1-1.png';
export const ORALPRO_REMOTE_LOGO_URL = 'https://i.ibb.co/vx8MfgHj/Design-sem-nome-1-1.png';
export const ORALPRO_LOCAL_LOGO_URL = '/images/oralpro-logo.png';

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
  // Support dynamic logo slot from CMS if mounted inside SiteContentProvider
  let dynamicLogoUrl: string | undefined;
  try {
    const siteContent = useSiteContent();
    const logoSlot = siteContent?.getSlot('header_logo', ORALPRO_REMOTE_LOGO_URL);
    if (logoSlot?.imageUrl) {
      dynamicLogoUrl = logoSlot.imageUrl;
    }
  } catch {
    // Rendered outside SiteContentProvider (e.g. isolated test or error boundary)
  }

  const activeUrl = dynamicLogoUrl || ORALPRO_REMOTE_LOGO_URL;
  const [imgSrc, setImgSrc] = useState(activeUrl);

  useEffect(() => {
    if (dynamicLogoUrl && dynamicLogoUrl !== imgSrc) {
      setImgSrc(dynamicLogoUrl);
    }
  }, [dynamicLogoUrl]);

  // Height configurations tuned for optimal balance across all screen sizes
  const heightClass = {
    xs: 'h-7 sm:h-8 max-w-[130px]',
    sm: 'h-8 sm:h-9 max-w-[150px]',
    md: 'h-9 sm:h-11 max-w-[180px]',
    header: 'h-11 sm:h-13 lg:h-15 max-w-[170px] sm:max-w-[210px] lg:max-w-[250px]',
    lg: 'h-13 sm:h-15 lg:h-17 max-w-[280px]',
    xl: 'h-16 sm:h-20 lg:h-24 max-w-[340px]',
  }[size] || 'h-11 sm:h-13 lg:h-15 max-w-[210px]';

  const logoImage = (
    <img
      src={imgSrc}
      alt="OralPro - Marketing Dentário"
      className={`${heightClass} w-auto object-contain select-none transition-transform duration-200 group-hover:scale-[1.02] shrink-0 bg-transparent`}
      onError={() => {
        if (imgSrc !== ORALPRO_LOCAL_LOGO_URL) {
          setImgSrc(ORALPRO_LOCAL_LOGO_URL);
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
