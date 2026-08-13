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
  add(marker: AMapOverlay | AMapOverlay[]): void;
  remove(marker: AMapOverlay | AMapOverlay[]): void;
  addControl(control: AMapControl): void;
  getBounds(): AMapBounds;
  resize?(): void;
  setCenter(position: [number, number], immediately?: boolean, duration?: number): void;
  setZoom(zoom: number, immediately?: boolean, duration?: number): void;
  setZoomAndCenter(zoom: number, position: [number, number], immediately?: boolean, duration?: number): void;
  setFitView(overlays?: unknown[], immediately?: boolean, avoid?: number[], maxZoom?: number): void;
  zoomIn?(): void;
  zoomOut?(): void;
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
  pixel?: {
    x?: number;
    y?: number;
    getX?: () => number;
    getY?: () => number;
  };
}

export interface AMapInfoWindow {
  open(map: AMapMap, position: [number, number]): void;
  close(): void;
}

export interface AMapPixel {
  offset: [number, number];
}

export interface AMapControl {
  show?(): void;
  hide?(): void;
  remove?(): void;
}

export interface AMapPolyline {
  setMap(map: AMapMap | null): void;
}

export interface AMapPolygon {
  setMap(map: AMapMap | null): void;
  setPath?(path: Array<[number, number]> | Array<Array<[number, number]>>): void;
}

export interface AMapCircle {
  setMap(map: AMapMap | null): void;
}

export type AMapOverlay = AMapMarker | AMapPolyline | AMapPolygon | AMapCircle;

export interface AMapContextMenu {
  addItem(label: string, handler: () => void, index?: number): void;
  open(map: AMapMap, position: AMapLngLat | [number, number]): void;
  close?(): void;
}

export type AMapRouteStatus = 'complete' | 'error' | 'no_data';

export interface AMapRouteSearchResult {
  routes?: Array<{
    distance?: number;
    time?: number;
  }>;
  plans?: Array<{
    distance?: number;
    time?: number;
  }>;
}

export interface AMapRoutePlanner {
  search(
    origin: AMapLngLat | [number, number],
    destination: AMapLngLat | [number, number],
    callback?: (status: AMapRouteStatus, result: AMapRouteSearchResult | string) => void
  ): void;
  search(
    origin: AMapLngLat | [number, number],
    destination: AMapLngLat | [number, number],
    options: Record<string, unknown>,
    callback?: (status: AMapRouteStatus, result: AMapRouteSearchResult | string) => void
  ): void;
  clear?(): void;
}

export interface AMapNamespace {
  Map: new (container: string | HTMLDivElement, options: Record<string, unknown>) => AMapMap;
  LngLat: new (lng: number, lat: number, noWrap?: boolean) => AMapLngLat;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow;
  Polyline: new (options: Record<string, unknown>) => AMapPolyline;
  Polygon: new (options: Record<string, unknown>) => AMapPolygon;
  Circle: new (options: Record<string, unknown>) => AMapCircle;
  Pixel: new (x: number, y: number) => AMapPixel;
  ContextMenu?: new () => AMapContextMenu;
  Scale?: new (options?: Record<string, unknown>) => AMapControl;
  Driving: new (options: Record<string, unknown>) => AMapRoutePlanner;
  Walking: new (options: Record<string, unknown>) => AMapRoutePlanner;
  Riding: new (options: Record<string, unknown>) => AMapRoutePlanner;
  Transfer: new (options: Record<string, unknown>) => AMapRoutePlanner;
  plugin(pluginNames: string | string[], callback: () => void): void;
  getConfig?(): { appname?: string };
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
    window.AMap.getConfig && (window.AMap.getConfig().appname = 'amap-jsapi-skill');
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
        window.AMap.getConfig && (window.AMap.getConfig().appname = 'amap-jsapi-skill');
        cleanup();
        resolve(window.AMap);
      } else {
        cleanup();
        reject(new Error('高德地图 SDK 已返回但未初始化，请检查高德 JS API Key 和安全密钥'));
      }
    };

    const script = document.createElement('script');
    const plugins = ['AMap.Scale', 'AMap.Driving', 'AMap.Walking', 'AMap.Riding', 'AMap.Transfer'];
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}&plugin=${plugins.join(',')}&callback=__initFindMyHouseAmap`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('高德地图 SDK 加载失败，请检查网络、JS API Key 和高德控制台域名白名单'));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
