import React from 'react';

interface LogoProps {
  height?: number | string;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'light' | 'dark' | 'transparent';
}

export const ProdOpsLogo: React.FC<LogoProps> = ({ 
  height = 40, 
  width = 'auto', 
  className = '', 
  style = {},
  variant = 'transparent'
}) => {
  const src = variant === 'light' 
    ? '/branding/prodops-logo.png' 
    : '/branding/prodops-logo-transparent.png';

  return (
    <img 
      src={src} 
      alt="ProdOps — Production Planning, Execution & Quality Platform"
      height={typeof height === 'number' ? `${height}px` : height}
      width={typeof width === 'number' ? `${width}px` : width}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style
      }}
    />
  );
};

export const ProdOpsIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size = 32,
  className = '',
  style = {}
}) => {
  return (
    <img 
      src="/branding/prodops-icon-transparent.png"
      alt="ProdOps"
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style
      }}
    />
  );
};

export const ProdOpsHeaderBrand: React.FC<{ subtitle?: string }> = ({ subtitle }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <ProdOpsIcon size={30} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ 
          fontSize: '1.2rem', 
          fontWeight: 800, 
          letterSpacing: '-0.3px',
          color: '#ffffff'
        }}>
          Prod<span style={{ color: '#38bdf8' }}>Ops</span>
        </span>
        {subtitle && (
          <span style={{ 
            color: '#cbd5e1', 
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            opacity: 0.85
          }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
