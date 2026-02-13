"use client";

import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Snowflake,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<
  string,
  { icon: typeof Sun; color: string; label: string }
> = {
  sunny: { icon: Sun, color: "text-amber-500", label: "Sunny" },
  partly_cloudy: {
    icon: CloudSun,
    color: "text-amber-400",
    label: "Partly Cloudy",
  },
  cloudy: { icon: Cloud, color: "text-gray-400", label: "Cloudy" },
  fog: { icon: CloudFog, color: "text-gray-400", label: "Foggy" },
  drizzle: {
    icon: CloudDrizzle,
    color: "text-blue-400",
    label: "Drizzle",
  },
  rain: { icon: CloudRain, color: "text-blue-500", label: "Rain" },
  heavy_rain: {
    icon: CloudRain,
    color: "text-blue-700",
    label: "Heavy Rain",
  },
  sleet: { icon: CloudSnow, color: "text-cyan-500", label: "Sleet" },
  snow: { icon: Snowflake, color: "text-sky-300", label: "Snow" },
  heavy_snow: { icon: CloudSnow, color: "text-sky-400", label: "Heavy Snow" },
  thunderstorm: {
    icon: CloudLightning,
    color: "text-purple-500",
    label: "Thunderstorm",
  },
};

interface WeatherIconProps {
  icon: string;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

export default function WeatherIcon({
  icon,
  size = 18,
  className,
  showLabel = false,
}: WeatherIconProps) {
  const config = ICON_MAP[icon] || ICON_MAP.cloudy;
  const IconComponent = config.icon;

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={config.label}
    >
      <IconComponent size={size} className={config.color} />
      {showLabel && (
        <span className="text-xs text-gray-500">{config.label}</span>
      )}
    </span>
  );
}
