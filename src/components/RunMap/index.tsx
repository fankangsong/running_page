import MapboxLanguage from '@mapbox/mapbox-gl-language';
import React, { useRef, useCallback, useState } from 'react';
import Map, {
  Layer,
  Source,
  FullscreenControl,
  NavigationControl,
  MapRef,
} from 'react-map-gl';
import { MapInstance } from 'react-map-gl/src/types/lib';
import { Link } from 'react-router-dom';
import useActivities from '@/hooks/useActivities';
import {
  MAP_LAYER_LIST,
  IS_CHINESE,
  ROAD_LABEL_DISPLAY,
  MAIN_COLOR,
  MAPBOX_TOKEN,
  PROVINCE_FILL_COLOR,
  USE_DASH_LINE,
  LINE_OPACITY,
  PRIVACY_MODE,
} from '@/utils/const';
import {
  Coordinate,
  IViewState,
  geoJsonForMap,
  formatPace,
  convertMovingTime2Sec,
  RUN_TYPE,
  HIKE_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
  EBIKE_RIDE_TYPE,
  WALK_TYPE,
  SWIM_TYPE,
  ROWING_TYPE,
  KAYAKING_TYPE,
  SNOWBOARD_TYPE,
  SKI_TYPE,
  ROAD_TRIP_TYPE,
  CROSSFIT_TYPE,
  WEIGHT_TRAINING_TYPE,
  WORKOUT_TYPE,
  YOGA_TYPE,
  Activity,
} from '@/utils/utils';
import RunMarker from './RunMarker';
import ActivityIcon from '@/components/ActivityIcon';
import styles from './style.module.scss';
import { FeatureCollection } from 'geojson';
import { RPGeometry } from '@/static/run_countries';
import './mapbox.css';

interface IRunMapProps {
  viewState: IViewState;
  setViewState: (_viewState: IViewState) => void;
  changeYear: (_year: string) => void;
  geoData: FeatureCollection<RPGeometry>;
  thisYear: string;
}

const RunMap = ({
  viewState,
  setViewState,
  changeYear: _changeYear,
  geoData,
  thisYear: _thisYear,
}: IRunMapProps) => {
  const { provinces } = useActivities();
  const mapRef = useRef<MapRef>();
  const [internalViewState, setInternalViewState] =
    useState<IViewState>(viewState);
  const lastTargetKeyRef = useRef<string>('');
  const prevHasAnyTrackRef = useRef<boolean>(
    geoData.features.some((f) => f.geometry.coordinates.length > 0)
  );
  const isAnimatingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lights = !PRIVACY_MODE;
  // Fallback style when Mapbox token is missing or unauthorized in dev
  const FALLBACK_STYLE =
    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  const [mapStyleUrl, setMapStyleUrl] = useState<string>(
    MAPBOX_TOKEN ? 'mapbox://styles/mapbox/dark-v10' : FALLBACK_STYLE
  );
  const [mapLoaded, setMapLoaded] = useState(false);
  const keepWhenLightsOff = ['runs2'];
  function switchLayerVisibility(map: MapInstance, lights: boolean) {
    const styleJson = map.getStyle();
    styleJson.layers.forEach((it: { id: string }) => {
      if (!keepWhenLightsOff.includes(it.id)) {
        if (lights) map.setLayoutProperty(it.id, 'visibility', 'visible');
        else map.setLayoutProperty(it.id, 'visibility', 'none');
      }
    });
  }
  const mapRefCallback = useCallback(
    (ref: MapRef) => {
      if (ref !== null) {
        const map = ref.getMap();
        if (map && IS_CHINESE) {
          map.addControl(new MapboxLanguage({ defaultLanguage: 'zh-Hans' }));
        }
        map.on('style.load', () => {
          if (!ROAD_LABEL_DISPLAY) {
            MAP_LAYER_LIST.forEach((layerId) => {
              map.removeLayer(layerId);
            });
          }
          mapRef.current = ref;
          switchLayerVisibility(map, lights);
        });
        map.on('load', () => {
          setMapLoaded(true);
        });
        // Fallback to tokenless style if style/tile loading fails (e.g., 401 in dev)
        map.on('error', (e: any) => {
          const msg = String(e?.error?.message || e?.message || '');
          if (
            MAPBOX_TOKEN &&
            (msg.includes('Unauthorized') ||
              msg.includes('401') ||
              msg.includes('403') ||
              msg.includes('Forbidden') ||
              msg.includes('Not Found'))
          ) {
            setMapStyleUrl(FALLBACK_STYLE);
          }
        });
      }
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        switchLayerVisibility(map, lights);
      }
    },
    [mapRef, lights]
  );
  React.useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (mapLoaded) return;
    if (!mapStyleUrl.startsWith('mapbox://')) return;
    const t = setTimeout(() => {
      if (!mapLoaded) {
        setMapStyleUrl(FALLBACK_STYLE);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [MAPBOX_TOKEN, mapLoaded, mapStyleUrl]);

  const hasAnyTrack = React.useMemo(
    () => geoData.features.some((f) => f.geometry.coordinates.length > 0),
    [geoData]
  );

  React.useEffect(() => {
    prevHasAnyTrackRef.current = hasAnyTrack;
  }, [hasAnyTrack]);

  React.useEffect(() => {
    const lon = viewState.longitude;
    const lat = viewState.latitude;
    const zoom = viewState.zoom;
    if (
      typeof lon !== 'number' ||
      typeof lat !== 'number' ||
      typeof zoom !== 'number'
    ) {
      setInternalViewState(viewState);
      return;
    }

    const key = `${lon.toFixed(6)}|${lat.toFixed(6)}|${zoom.toFixed(3)}`;
    if (lastTargetKeyRef.current === key) return;

    const currentLon = internalViewState.longitude;
    const currentLat = internalViewState.latitude;
    const currentZoom = internalViewState.zoom;
    const hasCurrent =
      typeof currentLon === 'number' &&
      typeof currentLat === 'number' &&
      typeof currentZoom === 'number';
    const closeEnough =
      hasCurrent &&
      Math.abs(currentLon - lon) < 1e-6 &&
      Math.abs(currentLat - lat) < 1e-6 &&
      Math.abs(currentZoom - zoom) < 1e-3;
    if (closeEnough) {
      lastTargetKeyRef.current = key;
      return;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    lastTargetKeyRef.current = key;
    if (!hasCurrent || !mapLoaded) {
      setInternalViewState(viewState);
      setViewState(viewState);
      return;
    }

    isAnimatingRef.current = true;
    const startTime = performance.now();
    const durationMs = 800;
    let from = { longitude: currentLon, latitude: currentLat, zoom: currentZoom };
    let to = { longitude: lon, latitude: lat, zoom };

    const prevHadTrack = prevHasAnyTrackRef.current;
    if (!prevHadTrack) {
      const startZoom = Math.min(3, Math.max(0, zoom - 6));
      from = { longitude: lon, latitude: lat, zoom: startZoom };
      to = { longitude: lon, latitude: lat, zoom };
      setInternalViewState((prev) => ({
        ...prev,
        longitude: lon,
        latitude: lat,
        zoom: startZoom,
      }));
    }

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = (now: number) => {
      if (!isAnimatingRef.current) return;
      const t = Math.min(1, (now - startTime) / durationMs);
      const e = easeInOutCubic(t);
      setInternalViewState((prev) => ({
        ...prev,
        longitude: lerp(from.longitude, to.longitude, e),
        latitude: lerp(from.latitude, to.latitude, e),
        zoom: lerp(from.zoom, to.zoom, e),
      }));
      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      rafIdRef.current = null;
      isAnimatingRef.current = false;
      setViewState(to);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, [
    internalViewState.latitude,
    internalViewState.longitude,
    internalViewState.zoom,
    mapLoaded,
    setViewState,
    viewState.latitude,
    viewState.longitude,
    viewState.zoom,
  ]);
  const filterProvinces = provinces.slice();
  // for geojson format
  filterProvinces.unshift('in', 'name');

  const initGeoDataLength = geoData.features.length;
  const isBigMap = (internalViewState.zoom ?? viewState.zoom ?? 0) <= 3;
  if (isBigMap && IS_CHINESE) {
    // Show boundary and line together, combine geoData(only when not combine yet)
    if (geoData.features.length === initGeoDataLength) {
      geoData = {
        type: 'FeatureCollection',
        features: geoData.features.concat(geoJsonForMap().features),
      };
    }
  }

  const isSingleActivity = geoData.features.length === 1;
  const hasTrack =
    isSingleActivity && geoData.features[0].geometry.coordinates.length > 0;
  let startLon = 0;
  let startLat = 0;
  let endLon = 0;
  let endLat = 0;
  let run: Activity | null = null;
  if (isSingleActivity) {
    run = geoData.features[0].properties as Activity;
  }
  if (hasTrack) {
    const points = geoData.features[0].geometry.coordinates as Coordinate[];
    [startLon, startLat] = points[0];
    [endLon, endLat] = points[points.length - 1];
  }
  let dash = USE_DASH_LINE && !isSingleActivity && !isBigMap ? [2, 2] : [2, 0];
  const onMove = React.useCallback(
    ({
      viewState,
      originalEvent,
    }: {
      viewState: IViewState;
      originalEvent?: any;
    }) => {
      if (originalEvent) {
        isAnimatingRef.current = false;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      }
      setInternalViewState(viewState);
      if (!isAnimatingRef.current || originalEvent) {
        setViewState(viewState);
      }
    },
    [setViewState]
  );
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
  };
  const fullscreenButton: React.CSSProperties = {
    position: 'absolute',
    marginTop: '29.2px',
    right: '0px',
    opacity: 0.3,
  };

  const pad2 = (n: number) => String(n).padStart(2, '0');

  let timeRange = '';
  let displayDuration = '';
  if (run) {
    const durationTotalSeconds = convertMovingTime2Sec(run.moving_time);
    const hours = Math.floor(durationTotalSeconds / 3600);
    const minutes = Math.floor((durationTotalSeconds % 3600) / 60);
    const seconds = Math.floor(durationTotalSeconds % 60);
    displayDuration = `${hours}:${pad2(minutes)}:${pad2(seconds)}`;

    const startTime = run.start_date_local.split(' ')[1];
    if (startTime) {
      const [h, m, s] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(h, m, s);
      const endDate = new Date(
        startDate.getTime() + durationTotalSeconds * 1000
      );
      const endTime = endDate.toTimeString().split(' ')[0];
      timeRange = `${startTime}~${endTime}`;
    }
  }

  return (
    <div className="relative w-full h-full">
      <Map
        {...internalViewState}
        onMove={onMove}
        style={style}
        mapStyle={mapStyleUrl}
        ref={mapRefCallback}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <Source id="data" type="geojson" data={geoData}>
          <Layer
            id="province"
            type="fill"
            paint={{
              'fill-color': PROVINCE_FILL_COLOR,
            }}
            filter={filterProvinces}
          />
          <Layer
            id="runs2"
            type="line"
            paint={{
              'line-color': MAIN_COLOR,
              'line-width': isBigMap && lights ? 1 : 2,
              'line-dasharray': dash,
              'line-opacity':
                isSingleActivity || isBigMap || !lights ? 1 : LINE_OPACITY,
              'line-blur': 1,
            }}
            layout={{
              'line-join': 'round',
              'line-cap': 'round',
            }}
          />
        </Source>
        {hasTrack && (
          <RunMarker
            startLat={startLat}
            startLon={startLon}
            endLat={endLat}
            endLon={endLon}
          />
        )}
        {/* <span className={styles.runTitle}>{title}</span> */}
        <FullscreenControl style={fullscreenButton} />
        <NavigationControl
          showCompass={false}
          position={'bottom-right'}
          style={{ opacity: 0.3 }}
        />
      </Map>
      {isSingleActivity && run && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl px-4 py-3 w-72 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-primary font-bold truncate">
                  <div className="shrink-0">
                    <ActivityIcon size={16} type={run.type} />
                  </div>
                  <span className="truncate">{run.name}</span>
                </div>
                <div className="text-xs text-gray-400 font-mono pl-6">
                  {timeRange}
                </div>
              </div>
              <Link
                to={`/run/${run.run_id}`}
                className="ml-2 text-gray-400 hover:text-white transition-colors pointer-events-auto shrink-0"
                title="View Details"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </Link>
            </div>
            <div className="flex justify-between items-end gap-2">
              <div>
                <div className="text-[10px] text-blue-400 font-bold tracking-[0.6px] uppercase">
                  KM
                </div>
                <div className="text-lg font-bold text-primary tabular-nums text-[yellow]">
                  {(run.distance / 1000).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-purple-400 font-bold tracking-[0.6px] uppercase">
                  Time
                </div>
                <div className="text-lg font-bold text-primary tabular-nums text-white">
                  {displayDuration}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-400 font-bold tracking-[0.6px] uppercase">
                  Pace
                </div>
                <div className="text-lg font-bold text-primary tabular-nums text-[#81d4fa]">
                  {formatPace(run.average_speed)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-red-400 font-bold tracking-[0.6px] uppercase">
                  BPM
                </div>
                <div className="text-lg font-bold text-primary tabular-nums text-[red]">
                  {run.average_heartrate?.toFixed(0) || '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunMap;
