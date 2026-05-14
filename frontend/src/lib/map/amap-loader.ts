declare global {
  interface Window {
    AMap?: AMapNamespace;
    __initFindMyHouseAmap?: () => void;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

export interface AMapLngLat {
  lng: number;
  lat: number;
}

export interface AMapBounds {
  getSouthWest(): AMapLngLat;
  getNorthEast(): AMapLngLat;
}

export interface AMapMap {
  add(marker: AMapMarker | AMapMarker[] | AMapPolyline): void;
  remove(marker: AMapMarker | AMapPolyline): void;
  clearMap(): void;
  getBounds(): AMapBounds;
  resize?(): void;
  setCenter(position: [number, number], immediately?: boolean, duration?: number): void;
  setZoom?(zoom: number, immediately?: boolean, duration?: number): void;
  setZoomAndCenter?(zoom: number, position: [number, number], immediately?: boolean, duration?: number): void;
  setFitView(overlays?: unknown[]): void;
  on(eventName: string, handler: (event?: AMapMouseEvent) => void): void;
  destroy(): void;
}

export interface AMapLngLat {
  lng: number;
  lat: number;
}

export interface AMapMarker {
  on(eventName: string, handler: () => void): void;
}

export interface AMapMouseEvent {
  lnglat?: {
    lng?: number;
    lat?: number;
    getLng?: () => number;
    getLat?: () => number;
  };
}

export interface AMapInfoWindow {
  open(map: AMapMap, position: [number, number]): void;
  close(): void;
}

export interface AMapPixel {
  offset: [number, number];
}

export interface AMapPolyline {
  setMap(map: AMapMap | null): void;
}

export interface AMapNamespace {
  Map: new (container: string | HTMLDivElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow;
  Polyline: new (options: Record<string, unknown>) => AMapPolyline;
  Pixel: new (x: number, y: number) => AMapPixel;
}

interface AmapConfig {
  key: string;
  securityJsCode: string;
}

let cachedConfig: AmapConfig | undefined;
let configPromise: Promise<AmapConfig> | undefined;

async function fetchAmapConfig(): Promise<AmapConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (configPromise) {
    return configPromise;
  }

  configPromise = fetch('/api/config')
    .then((res) => res.json())
    .then((json: { data: { viteAmapJsKey: string; viteAmapSecurityJsCode: string } }) => {
      const key = json.data.viteAmapJsKey;
      if (!key) {
        throw new Error('请在欢迎页配置高德 JS API Key');
      }
      cachedConfig = { key, securityJsCode: json.data.viteAmapSecurityJsCode };
      return cachedConfig;
    });

  return configPromise;
}

let loadingPromise: Promise<AMapNamespace> | undefined;

export async function loadAmap(): Promise<AMapNamespace> {
  if (window.AMap) {
    return window.AMap;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  const config = await fetchAmapConfig();

  if (config.securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };
  }

  loadingPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('高德地图 SDK 加载超时，请检查 JS API Key、安全密钥和 localhost 域名白名单'));
    }, 10000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window.__initFindMyHouseAmap;
    }

    window.__initFindMyHouseAmap = () => {
      if (window.AMap) {
        cleanup();
        resolve(window.AMap);
      } else {
        cleanup();
        reject(new Error('高德地图 SDK 已返回但未初始化，请检查高德 JS API Key 和安全密钥'));
      }
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}&callback=__initFindMyHouseAmap`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('高德地图 SDK 加载失败，请检查网络、JS API Key 和高德控制台域名白名单'));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
