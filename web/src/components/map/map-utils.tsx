import L, { DivIcon } from "leaflet";
import { MapPinIcon } from "lucide-react";
import { useMemo } from "react";
import ReactDOMServer from "react-dom/server";
import { TileLayer } from "react-leaflet";
import { useAuth } from "@/contexts/AuthContext";
import { resolveTheme } from "@/utils/theme";

// WGS-84 转 GCJ-02 函数（火星坐标转换）
function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  const PI = 3.1415926535897932384626;
  const A = 6378245.0;
  const EE = 0.00669342162296594323;

  function outOfChina(lng: number, lat: number): boolean {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLat(x: number, y: number): number {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLon(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLon(lng - 105.0, lat - 35.0);
  let radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  let sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return [lng + dLng, lat + dLat];
}

// 高德瓦片 URL（已修正为标准格式）
const TILE_URLS = {
  light: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=1&style=7&x={x}&y={y}&z={z}",
  dark: "https://wprd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scl=1&style=7&x={x}&y={y}&z={z}",
} as const;

// 全局坐标转换 patch（放在这里是为了确保所有 Leaflet 坐标都自动转换）
if (typeof window !== "undefined") {
  const originalLatLng = L.latLng;

  L.latLng = function (a: number | L.LatLngExpression, b?: number): L.LatLng {
    let lat: number, lng: number;

    if (typeof a === "number" && typeof b === "number") {
      [lat, lng] = [a, b];
    } else if (Array.isArray(a)) {
      [lat, lng] = a as [number, number];
    } else if (a instanceof L.LatLng) {
      return a;
    } else {
      return originalLatLng(a as any);
    }

    // 只对中国大陆范围内的坐标进行转换
    if (lng >= 72 && lng <= 138 && lat >= 0 && lat <= 56) {
      [lng, lat] = wgs84ToGcj02(lng, lat);
    }

    return originalLatLng(lat, lng);
  } as typeof L.latLng;
}

export const ThemedTileLayer = () => {
  const { userGeneralSetting } = useAuth();
  const isDark = useMemo(
      () => resolveTheme(userGeneralSetting?.theme || "system").includes("dark"),
      [userGeneralSetting?.theme]
  );

  return <TileLayer url={isDark ? TILE_URLS.dark : TILE_URLS.light} />;
};

interface MarkerIconOptions {
  fill?: string;
  size?: number;
  className?: string;
}

export const createMarkerIcon = (options?: MarkerIconOptions): DivIcon => {
  const { fill = "orange", size = 28, className = "" } = options || {};

  return new DivIcon({
    className: "relative border-none",
    html: ReactDOMServer.renderToString(
        <MapPinIcon
            className={`absolute bottom-1/2 -left-1/2 ${className}`.trim()}
            fill={fill}
            size={size}
        />
    ),
  });
};

export const defaultMarkerIcon = createMarkerIcon();