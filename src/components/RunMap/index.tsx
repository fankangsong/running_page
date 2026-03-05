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
import { Coordinate, IViewState, geoJsonForMap } from '@/utils/utils';
import RunMarker from './RunMarker';
import styles from './style.module.scss';
import { FeatureCollection } from 'geojson';
import { RPGeometry } from '@/static/run_countries';
import './mapbox.css';

interface IRunMapProps {
  title: string;
  viewState: IViewState;
  setViewState: (_viewState: IViewState) => void;
  changeYear: (_year: string) => void;
  geoData: FeatureCollection<RPGeometry>;
  thisYear: string;
}

const RunMap = ({
  title,
  viewState,
  setViewState,
  changeYear: _changeYear,
  geoData,
  thisYear: _thisYear,
}: IRunMapProps) => {
  const { provinces } = useActivities();
  const mapRef = useRef<MapRef>();
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
  const filterProvinces = provinces.slice();
  // for geojson format
  filterProvinces.unshift('in', 'name');

  const initGeoDataLength = geoData.features.length;
  const isBigMap = (viewState.zoom ?? 0) <= 3;
  if (isBigMap && IS_CHINESE) {
    // Show boundary and line together, combine geoData(only when not combine yet)
    if (geoData.features.length === initGeoDataLength) {
      geoData = {
        type: 'FeatureCollection',
        features: geoData.features.concat(geoJsonForMap().features),
      };
    }
  }

  const isSingleRun =
    geoData.features.length === 1 &&
    geoData.features[0].geometry.coordinates.length;
  let startLon = 0;
  let startLat = 0;
  let endLon = 0;
  let endLat = 0;
  if (isSingleRun) {
    const points = geoData.features[0].geometry.coordinates as Coordinate[];
    [startLon, startLat] = points[0];
    [endLon, endLat] = points[points.length - 1];
  }
  let dash = USE_DASH_LINE && !isSingleRun && !isBigMap ? [2, 2] : [2, 0];
  const onMove = React.useCallback(
    ({ viewState }: { viewState: IViewState }) => {
      setViewState(viewState);
    },
    []
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

  return (
    <Map
      {...viewState}
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
              isSingleRun || isBigMap || !lights ? 1 : LINE_OPACITY,
            'line-blur': 1,
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
        />
      </Source>
      {isSingleRun && (
        <RunMarker
          startLat={startLat}
          startLon={startLon}
          endLat={endLat}
          endLon={endLon}
        />
      )}
      <span className={styles.runTitle}>{title}</span>
      <FullscreenControl style={fullscreenButton} />
      <NavigationControl
        showCompass={false}
        position={'bottom-right'}
        style={{ opacity: 0.3 }}
      />
    </Map>
  );
};

export default RunMap;
