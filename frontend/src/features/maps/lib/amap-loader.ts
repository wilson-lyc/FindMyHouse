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
  add(marker: AMapMarker | AMapMarker[]): void;
  clearMap(): void;
  getBounds(): AMapBounds;
  setFitView(): void;
  on(eventName: string, handler: () => void): void;
  destroy(): void;
}

export interface AMapMarker {
  on(eventName: string, handler: () => void): void;
}

export interface AMapInfoWindow {
  open(map: AMapMap, position: [number, number]): void;
}

export interface AMapNamespace {
  Map: new (container: string | HTMLDivElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow;
}

let loadingPromise: Promise<AMapNamespace> | undefined;

export function loadAmap() {
  if (window.AMap) {
    return Promise.resolve(window.AMap);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  const key = import.meta.env.VITE_AMAP_JS_KEY as string | undefined;
  const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE as string | undefined;

  if (!key || key === 'your-amap-js-api-key') {
    return Promise.reject(new Error('请在 .env 中配置 VITE_AMAP_JS_KEY'));
  }

  if (securityJsCode) {
    window._AMapSecurityConfig = { securityJsCode };
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
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=__initFindMyHouseAmap`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('高德地图 SDK 加载失败，请检查网络、JS API Key 和高德控制台域名白名单'));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
