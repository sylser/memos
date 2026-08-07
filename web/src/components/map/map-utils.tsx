import { DivIcon } from "leaflet";
import { MapPinIcon } from "lucide-react";
import { useMemo } from "react";
import ReactDOMServer from "react-dom/server";
import { TileLayer } from "react-leaflet";
import { useAuth } from "@/contexts/AuthContext";
import { resolveTheme } from "@/utils/theme";
import type { MapPoint } from "./types";

// WGS-84 -> GCJ-02 (needed for Amap tiles / APIs inside China).
export function wgs84ToGcj02(lng: number, lat: number): MapPoint {
  const PI = Math.PI;
  const A = 6378245.0;
  const EE = 0.006693421622965943;

  const outOfChina = (longitude: number, latitude: number): boolean => {
    return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
  };

  const transformLat = (x: number, y: number): number => {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  };

  const transformLon = (x: number, y: number): number => {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
  };

  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLon(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
  return { lng: lng + dLng, lat: lat + dLat };
}

export function convertBrowserPositionToMapPoint(lat: number, lng: number): MapPoint {
  return wgs84ToGcj02(lng, lat);
}

// Amap raster tiles (GCJ-02).
const TILE_URLS = {
  light: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=1&style=7&x={x}&y={y}&z={z}",
  dark: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=1&style=8&x={x}&y={y}&z={z}",
} as const;

export const ThemedTileLayer = () => {
  const { userGeneralSetting } = useAuth();
  const isDark = useMemo(() => resolveTheme(userGeneralSetting?.theme || "system").includes("dark"), [userGeneralSetting?.theme]);

  return <TileLayer url={isDark ? TILE_URLS.dark : TILE_URLS.light} attribution="&copy; 高德地图" />;
};

interface MarkerIconOptions {
  fill?: string;
  size?: number;
  className?: string;
}

export const createMarkerIcon = (options?: MarkerIconOptions): DivIcon => {
  const { fill = "var(--primary)", size = 28, className = "" } = options || {};

  return new DivIcon({
    className: "relative border-none bg-transparent",
    html: ReactDOMServer.renderToString(
      <div className={`relative flex items-center justify-center ${className}`.trim()}>
        <MapPinIcon fill={fill} size={size} strokeWidth={1.9} style={{ filter: "drop-shadow(0 6px 10px rgba(15, 23, 42, 0.22))" }} />
      </div>,
    ),
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, size + 4],
    popupAnchor: [0, -(size * 0.7)],
  });
};

export const defaultMarkerIcon = createMarkerIcon();
