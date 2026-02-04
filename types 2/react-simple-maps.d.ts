declare module 'react-simple-maps' {
  import { ReactNode } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
    };
    className?: string;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children?: (args: {
      geographies: any[];
    }) => ReactNode;
  }

  export interface GeographyProps {
    geography?: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    className?: string;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    children?: ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
}

