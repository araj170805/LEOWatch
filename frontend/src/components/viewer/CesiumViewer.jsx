import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

const PALETTE = [
  { color: '#5FDBCF', cesium: Cesium.Color.CYAN.withAlpha(0.9) },
  { color: '#FA8A4B', cesium: new Cesium.Color(1.0, 0.54, 0.29, 0.9) },
  { color: '#C792EA', cesium: new Cesium.Color(0.78, 0.57, 0.92, 0.9) },
  { color: '#F7E05C', cesium: new Cesium.Color(0.97, 0.88, 0.36, 0.9) },
];

const RISK_COLORS = {
  LOW: Cesium.Color.LIMEGREEN,
  MEDIUM: new Cesium.Color(0.94, 0.75, 0.15, 1),
  HIGH: new Cesium.Color(1.0, 0.55, 0.25, 1),
  CRITICAL: Cesium.Color.RED,
};

function toCartesian(posKm) {
  return new Cesium.Cartesian3(posKm[0] * 1000, posKm[1] * 1000, posKm[2] * 1000);
}

function riskColor(risk) {
  return RISK_COLORS[risk] || Cesium.Color.WHITE;
}

export default function CesiumViewer({ objects = [], selectedEvent }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const entitiesRef = useRef([]);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [mapStyle, setMapStyle] = useState('satellite');

  const BASEMAPS = {
    satellite: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri, Maxar',
      }),
    dark: () =>
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
      }),
    streets: () =>
      new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      }),
  };

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || failed || !BASEMAPS[mapStyle]) return;
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(BASEMAPS[mapStyle]());
  }, [mapStyle, failed]);

  useEffect(() => {
    let viewer;
    try {
      const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

      const baseLayer =
        ionToken != null
          ? undefined
          : new Cesium.ImageryLayer(
              new Cesium.OpenStreetMapImageryProvider({
                url: 'https://tile.openstreetmap.org/',
              })
            );

      viewer = new Cesium.Viewer(containerRef.current, {
        baseLayer,
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: true,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        requestRenderMode: false,
      });
      const sseh =
        viewer.screenSpaceEventHandler || viewer.cesiumWidget?.screenSpaceEventHandler;
      sseh?.removeInput?.(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      viewer.scene.globe.enableLighting = false;
      
      // Center globe properly
      viewer.camera.flyHome(0);
      viewer.clock.shouldAnimate = true;
      viewer.clock.multiplier = 60;
      viewerRef.current = viewer;
    } catch (err) {
      console.error('Cesium viewer init failed:', err);
      setFailReason(err?.message || String(err));
      setFailed(true);
    }
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
      entitiesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || failed || !objects.length) return;

    entitiesRef.current.forEach((e) => viewer.entities.remove(e));
    entitiesRef.current = [];

    let minTime = null;
    let maxTime = null;

    objects.forEach((obj, idx) => {
      if (!obj?.points?.length) return;
      const style = PALETTE[idx % PALETTE.length];
      const start = Cesium.JulianDate.fromIso8601(obj.points[0].time);
      const end = Cesium.JulianDate.fromIso8601(obj.points[obj.points.length - 1].time);
      if (!minTime || Cesium.JulianDate.lessThan(start, minTime)) minTime = start;
      if (!maxTime || Cesium.JulianDate.greaterThan(end, maxTime)) maxTime = end;

      const property = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.FIXED);
      obj.points.forEach((pt) => {
        const t = Cesium.JulianDate.fromIso8601(pt.time);
        property.addSample(t, toCartesian(pt.position));
      });
      property.setInterpolationOptions({
        interpolationDegree: 3,
        interpolationAlgorithm: Cesium.HermitePolynomialApproximation,
      });

      entitiesRef.current.push(
        viewer.entities.add({
          name: obj.name,
          availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({ start: minTime, stop: maxTime }),
          ]),
          position: property,
          point: {
            pixelSize: 9,
            color: style.cesium,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
          label: {
            text: obj.name,
            font: '12px "IBM Plex Mono", monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(12, -12),
            showBackground: true,
            backgroundColor: new Cesium.Color(0.09, 0.12, 0.16, 0.85),
          },
        })
      );

      const positions = obj.points.map((pt) => toCartesian(pt.position));
      entitiesRef.current.push(
        viewer.entities.add({
          polyline: {
            positions,
            width: 1.5,
            material: new Cesium.PolylineOutlineMaterialProperty({
              color: style.cesium.withAlpha(0.55),
              outlineWidth: 0,
            }),
          },
        })
      );
    });

    if (minTime && maxTime) {
      viewer.clock.startTime = minTime.clone();
      viewer.clock.stopTime = maxTime.clone();
      viewer.clock.currentTime = minTime.clone();
      viewer.clock.multiplier = 300;
      viewer.clock.shouldAnimate = true;
      viewer.timeline?.zoomTo(minTime, maxTime);
      viewer.scene.requestRender?.();
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
        duration: 1.5,
      });
    }
  }, [objects, failed]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || failed || !selectedEvent) return;

    const pa = selectedEvent.position_a_at_tca ? toCartesian(selectedEvent.position_a_at_tca) : null;
    const pb = selectedEvent.position_b_at_tca ? toCartesian(selectedEvent.position_b_at_tca) : null;
    const color = riskColor(selectedEvent.risk);
    const label =
      `TCA\n${Number(selectedEvent.minimum_distance_km).toFixed(2)} km\n${selectedEvent.risk}`;

    const markerOpts = (pos) => ({
      position: pos,
      point: { pixelSize: 14, color, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
      label: {
        text: label,
        font: '13px "IBM Plex Mono", monospace',
        fillColor: color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        pixelOffset: new Cesium.Cartesian2(0, -28),
        showBackground: true,
        backgroundColor: new Cesium.Color(0.06, 0.08, 0.11, 0.92),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      },
    });

    if (pa) entitiesRef.current.push(viewer.entities.add(markerOpts(pa)));
    if (pb) entitiesRef.current.push(viewer.entities.add(markerOpts(pb)));
    if (pa && pb) {
      entitiesRef.current.push(
        viewer.entities.add({
          polyline: {
            positions: [pa, pb],
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
              color: color.withAlpha(0.9),
              dashLength: 12,
            }),
          },
        })
      );
    }

    if (pa && pb) {
      const bs = Cesium.BoundingSphere.fromPoints([pa, pb]);
      viewer.camera.flyToBoundingSphere(bs, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(0, -0.7, 12000000),
      });
    }

    return () => {
      entitiesRef.current.forEach((e) => {
        if (viewer && !viewer.isDestroyed()) viewer.entities.remove(e);
      });
      entitiesRef.current = [];
    };
  }, [selectedEvent, failed]);

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-void">
        <p className="font-mono text-xs text-faint text-center px-6">
          WebGL unavailable — 3D globe could not be initialized in this browser.
        </p>
        {failReason && (
          <p className="font-mono text-[10px] text-risk-med text-center px-6 break-words max-w-md">
            {failReason}
          </p>
        )}
        <a
          href="/dashboard"
          className="font-mono text-xs border border-line rounded-sm px-4 py-2 text-dim hover:text-primary hover:border-line-bright transition-colors"
        >
          Back to Dashboard
        </a>
        <p className="font-mono text-[10px] text-faint px-6 text-center">
          Tip: enable hardware acceleration in browser settings, or try Chrome / Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-6 left-4 z-20 flex items-center gap-2 border border-[rgba(0,240,255,0.3)] bg-[#0b1026]/90 backdrop-blur-xl rounded-xl px-3 py-1.5 shadow-xl">
        <span className="font-mono text-[10px] text-[#00f0ff] uppercase tracking-wider font-bold">EARTH VIEW:</span>
        <select
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value)}
          className="font-mono text-xs bg-transparent text-white focus:outline-none cursor-pointer font-medium"
          title="Earth imagery style"
        >
          <option value="satellite" className="bg-[#0b1026] text-white">SATELLITE 🌍</option>
          <option value="dark" className="bg-[#0b1026] text-white">DARK MODE 🌙</option>
          <option value="streets" className="bg-[#0b1026] text-white">STREETS 🗺️</option>
        </select>
      </div>
    </div>
  );
}
