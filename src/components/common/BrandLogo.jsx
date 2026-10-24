import React from 'react';
import logoImage from '../../../logo.png';

const sizes = {
  tiny: 'h-4 w-4',
  small: 'h-8 w-8',
  medium: 'h-11 w-11',
  large: 'h-24 w-24',
};

export default function BrandLogo({ size = 'medium', className = '' }) {
  return (
    <img
      src={logoImage}
      alt="HCM Lite Logo"
      className={`${sizes[size] || sizes.medium} shrink-0 object-contain ${className}`}
    />
  );
}
