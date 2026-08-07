import { useQuery } from "@tanstack/react-query";

const AMAP_KEY = "ae55a1e821323f4238ab0a7dfca5d6a2";

const AMAP_GEOCODING = {
  endpoint: "https://restapi.amap.com/v3/geocode/regeo",
  key: AMAP_KEY,
  extensions: "base",
  language: "zh_cn",
} as const;

const AMAP_IP_LOCATION = {
  endpoint: "https://restapi.amap.com/v3/ip",
  key: AMAP_KEY,
} as const;

export interface IPLocationResult {
  address: string;
  province: string;
  city: string;
  adcode: string;
  rectangle: string;
  ip: string;
}

const emptyIPLocation = (): IPLocationResult => ({
  address: "",
  province: "",
  city: "",
  adcode: "",
  rectangle: "",
  ip: "",
});

const formatAmapLocation = (lng: number, lat: number) => `${lng.toFixed(6)},${lat.toFixed(6)}`;

async function fetchPublicIP(): Promise<string | undefined> {
  try {
    const response = await fetch("https://ipinfo.io/ip");
    if (!response.ok) {
      return undefined;
    }
    const text = (await response.text()).trim();
    return text.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)?.[1];
  } catch {
    return undefined;
  }
}

async function fetchAmapIPLocation(ip?: string): Promise<IPLocationResult> {
  const url = ip
    ? `${AMAP_IP_LOCATION.endpoint}?key=${AMAP_IP_LOCATION.key}&ip=${encodeURIComponent(ip)}`
    : `${AMAP_IP_LOCATION.endpoint}?key=${AMAP_IP_LOCATION.key}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`高德IP定位失败: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "1") {
    throw new Error(data.info || "高德返回错误");
  }

  // Amap may return empty arrays for unknown fields.
  const province = typeof data.province === "string" ? data.province : "";
  const city = typeof data.city === "string" ? data.city : "";
  const adcode = typeof data.adcode === "string" ? data.adcode : "";
  const rectangle = typeof data.rectangle === "string" ? data.rectangle : "";
  const address = `${province}${city}`.trim();

  if (!address && !rectangle) {
    throw new Error("高德IP定位无有效结果");
  }

  return {
    address: address || "当前位置",
    province,
    city,
    adcode,
    rectangle,
    ip: ip || "",
  };
}

export const useReverseGeocoding = (lat: number | undefined, lng: number | undefined) => {
  return useQuery({
    queryKey: ["amap-geocoding", lat, lng],
    queryFn: async () => {
      if (lat === undefined || lng === undefined) {
        return undefined;
      }

      const location = formatAmapLocation(lng, lat);

      try {
        const url = `${AMAP_GEOCODING.endpoint}?key=${AMAP_GEOCODING.key}&location=${encodeURIComponent(location)}&extensions=${AMAP_GEOCODING.extensions}&language=${AMAP_GEOCODING.language}`;
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`高德逆地理编码失败: ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== "1") {
          throw new Error(data.info || "高德返回错误");
        }

        const component = data.regeocode?.addressComponent;
        const composed =
          `${component?.province || ""}${component?.city || ""}${component?.district || ""}${component?.township || ""}${component?.streetNumber?.street || ""}${component?.streetNumber?.number || ""}`.trim();
        const result = data.regeocode?.formatted_address || composed || location;
        return typeof result === "string" && result.length > 0 ? result : location;
      } catch (error) {
        console.error("高德逆地理编码失败:", error);
        return location;
      }
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: Infinity,
  });
};

export const useIPGeocoding = (ip?: string) => {
  return useQuery({
    queryKey: ["amap-ip-location", ip ?? "auto"],
    queryFn: async (): Promise<IPLocationResult> => {
      try {
        // Required order: public IP first, then Amap /v3/ip with that IP.
        const finalIP = ip || (await fetchPublicIP());
        if (finalIP) {
          return await fetchAmapIPLocation(finalIP);
        }

        // Fallback only when public-IP providers fail.
        console.warn("获取公网IP失败，尝试高德匿名IP定位");
        return await fetchAmapIPLocation();
      } catch (error) {
        console.error("高德IP定位失败:", error);
        // Return empty result (not "定位失败") so UI can keep placeholder blank.
        return emptyIPLocation();
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
};
