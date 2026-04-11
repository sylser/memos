import { useQuery } from "@tanstack/react-query";

const AMAP_GEOCODING = {
  endpoint: "https://restapi.amap.com/v3/geocode/regeo",
  key: "ae55a1e821323f4238ab0a7dfca5d6a2",
  extensions: "all",
  language: "zh",
} as const;

const AMAP_IP_LOCATION = {
  endpoint: "https://restapi.amap.com/v3/ip",
  key: "ae55a1e821323f4238ab0a7dfca5d6a2",
} as const;

export const useReverseGeocoding = (lat: number | undefined, lng: number | undefined) => {
  return useQuery({
    queryKey: ["amap-geocoding", lat, lng],
    queryFn: async () => {
      const coordString = `${lng?.toFixed(6)}, ${lat?.toFixed(6)}`; // 高德是 lng,lat 顺序
      if (lat === undefined || lng === undefined) return coordString;

      try {
        const url = `${AMAP_GEOCODING.endpoint}?key=${AMAP_GEOCODING.key}&location=${coordString}&extensions=${AMAP_GEOCODING.extensions}&language=${AMAP_GEOCODING.language}`;

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

        // 优先返回 formatted_address（完整地址）
        // 如果没有，就返回 addressComponent 的拼接
        const result = data.regeocode?.formatted_address ||
            `${data.regeocode?.addressComponent?.province || ""}${
                data.regeocode?.addressComponent?.city || ""
            }${data.regeocode?.addressComponent?.district || ""}${
                data.regeocode?.addressComponent?.street || ""
            }${data.regeocode?.addressComponent?.number || ""}`.trim() ||
            coordString;

        return result;
      } catch (error) {
        console.error("高德逆地理编码失败:", error);
        return coordString; // 失败时 fallback 到坐标字符串
      }
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: Infinity, // 永久缓存（坐标不变就不重新请求）
  });
};
export const useIPGeocoding = (ip?: string) => {
  return useQuery({
    queryKey: ["amap-ip-location", ip],
    queryFn: async () => {
      try {
        let finalIP = ip;

        // ✅ 如果没传 ip，就先获取公网 IP
        if (!finalIP) {
          const ipRes = await fetch("https://myip.ipip.net/");
          if (!ipRes.ok) {
            throw new Error("获取IP失败");
          }
          const ipText = await ipRes.text();
          // ipip.net 返回格式为 "当前 IP：xxx.xxx.xxx.xxx 来自于：..."
          const ipMatch = ipText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
          if (!ipMatch) {
            throw new Error("无法从响应中解析出IP地址");
          }
          finalIP = ipMatch[1];
        }

        // ✅ 调用高德接口
        const url = finalIP
            ? `${AMAP_IP_LOCATION.endpoint}?key=${AMAP_IP_LOCATION.key}&ip=${finalIP}`
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

        const result =
            `${data.province || ""}${data.city || ""}`.trim() || "未知位置";

        return {
          address: result,
          province: data.province,
          city: data.city,
          adcode: data.adcode,
          rectangle: data.rectangle,
          ip: finalIP, // ✅ 顺手把 IP 也返回
        };
      } catch (error) {
        console.error("高德IP定位失败:", error);
        return {
          address: "定位失败",
          province: "",
          city: "",
          adcode: "",
          rectangle: "",
          ip: "",
        };
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
};