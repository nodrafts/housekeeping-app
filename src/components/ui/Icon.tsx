import React from 'react';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
  SvgProps,
} from 'react-native-svg';

export type IconName =
  | 'alert-circle'
  | 'bed'
  | 'calendar'
  | 'check'
  | 'home'
  | 'settings'
  | 'skip'
  | 'sparkles'
  | 'user';

interface IconProps extends SvgProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  color = '#0f172a',
  strokeWidth = 2,
  ...props
}: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {name === 'home' ? (
        <>
          <Path d="M3 10.5 12 3l9 7.5" />
          <Path d="M5 9.5V21h14V9.5" />
          <Path d="M9 21v-6h6v6" />
        </>
      ) : null}

      {name === 'calendar' ? (
        <>
          <Rect x="3" y="4" width="18" height="17" rx="2" />
          <Line x1="8" y1="2.5" x2="8" y2="6.5" />
          <Line x1="16" y1="2.5" x2="16" y2="6.5" />
          <Line x1="3" y1="10" x2="21" y2="10" />
        </>
      ) : null}

      {name === 'bed' ? (
        <>
          <Path d="M4 11V5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5V11" />
          <Path d="M4 21v-8" />
          <Path d="M20 21v-8" />
          <Path d="M3 13h18" />
          <Path d="M5 17h14" />
          <Path d="M7 11V8h4v3" />
          <Path d="M13 11V8h4v3" />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      ) : null}

      {name === 'user' ? (
        <>
          <Circle cx="12" cy="8" r="4" />
          <Path d="M4 21a8 8 0 0 1 16 0" />
        </>
      ) : null}

      {name === 'check' ? <Polyline points="20 6 9 17 4 12" /> : null}

      {name === 'skip' ? (
        <>
          <Path d="m5 5 14 14" />
          <Path d="m19 5-14 14" />
        </>
      ) : null}

      {name === 'sparkles' ? (
        <>
          <Path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
          <Path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" />
          <Path d="M5 13l.8 1.7L7.5 15.5l-1.7.8L5 18l-.8-1.7-1.7-.8 1.7-.8L5 13Z" />
        </>
      ) : null}

      {name === 'alert-circle' ? (
        <>
          <Circle cx="12" cy="12" r="10" />
          <Line x1="12" y1="8" x2="12" y2="12" />
          <Line x1="12" y1="16" x2="12.01" y2="16" />
        </>
      ) : null}
    </Svg>
  );
}
