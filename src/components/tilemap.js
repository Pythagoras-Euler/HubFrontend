import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppContext } from "../context";
import { Typography } from "@mui/material";
import { Map, View } from "ol";
import { Tile } from "ol/layer";
import { XYZ } from "ol/source";
import { Feature } from "ol";
import { LineString, Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Projection } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import { Heatmap as HeatmapLayer } from "ol/layer";

import { makeRequestsAuto } from "../functions";

function calculateCenterPoint(points) {
  if (points.length === 0) {
    throw new Error("Empty points array");
  }

  let sumX = 0;
  let sumY = 0;

  for (const [x, y] of points) {
    sumX += x;
    sumY += -y;
  }

  const centerX = sumX / points.length;
  const centerY = sumY / points.length;

  return [centerX, centerY];
}

const TileMap = ({ tilesUrl, title, style, route, markers, points, onPointClick, onBoundaryChange, showOrangeOnly }) => {
  const { apiPath } = useContext(AppContext);
  const { t: tr } = useTranslation();
  const [mapError, setMapError] = useState(false);
  // showOrangeOnly => show vtc player only
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const isMountedRef = useRef(true);

  const pointsRef = useRef([]);
  const orangeOnlyRef = useRef(false);
  const pointsLayer = useRef(undefined);
  const heatmapLayer = useRef(undefined);
  const deliveryLayer = useRef(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      mapRef.current?.setTarget(null);
      mapRef.current?.dispose();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function doLoad({ tilesUrl, route, points, showOrangeOnly }) {
      if (!isMountedRef.current) {
        return; // If the component has unmounted, return immediately
      }

      if (!mapRef.current) {
        const knownMap = tilesUrl.match(/^https:\/\/map\.charlws\.com\/(ets2|ats)\/(base|promods|promods-classic)\/tiles$/);
        const infoUrl = knownMap ? `${apiPath}/map/info/${knownMap[1]}/${knownMap[2]}` : tilesUrl.replace(/\/tiles$/, "") + "/info/TileMapInfo.json";
        const [mapInfo] = await makeRequestsAuto([{ url: infoUrl, auth: false }]);
        if (cancelled || !isMountedRef.current) return;
        if (!mapInfo || mapInfo.error || !Number.isFinite(mapInfo.x1)) {
          setMapError(true);
          return;
        }
        setMapError(false);

        const tsProjection = new Projection({
          code: "ZOOMIFY",
          units: "pixels",
          extent: [
            mapInfo.x1,
            -mapInfo.y2,
            mapInfo.x2,
            -mapInfo.y1, // x1, -y2, x2, -y1 (reverse y direction)
          ],
        });

        // Create a new OpenLayers map instance
        const map = new Map({
          target: mapContainerRef.current,
          controls: [],
          layers: [
            // Add a tile layer with the tiled map as the source
            new Tile({
              source: new XYZ({
                url: `${tilesUrl}/{z}/{x}/{y}.png`,
                wrapX: false,
                projection: tsProjection,
              }),
            }),
          ],
          view: new View({
            center: route?.length ? calculateCenterPoint(route) : markers?.length ? calculateCenterPoint(markers) : [(mapInfo.x1 + mapInfo.x2) / 2, -(mapInfo.y1 + mapInfo.y2) / 2],
            zoom: 1, // Set the initial zoom level
            minZoom: mapInfo.minZoom,
            maxZoom: mapInfo.maxZoom,
            projection: tsProjection,
            extent: tsProjection.getExtent(),
            constrainOnlyCenter: true,
          }),
        });

        if (onBoundaryChange !== undefined) {
          const view = map.getView();
          const center = view.getCenter();
          const resolution = view.getResolution();
          const size = map.getSize();
          if (!size) return;
          const width = size[0] * resolution;
          const height = size[1] * resolution;
          const extent = [center[0] - width / 2, center[1] - height / 2, center[0] + width / 2, center[1] + height / 2];
          const boundary = {
            x1: parseInt(extent[0]),
            y1: parseInt(-extent[3]),
            x2: parseInt(extent[2]),
            y2: parseInt(-extent[1]),
          };
          onBoundaryChange(boundary);
        }

        mapRef.current = map;
      }

      const map = mapRef.current;
      if (deliveryLayer.current) {
        map.removeLayer(deliveryLayer.current);
        deliveryLayer.current = undefined;
      }

      if (route !== undefined && route !== null && route.length !== 0) {
        const lineStyle = new Style({
          stroke: new Stroke({
            color: "rgba(33, 243, 150, 0.7)",
            width: 5,
            shadowColor: "rgba(0, 0, 0, 0.5)",
            shadowBlur: 10,
          }),
        });

        let features = [];
        for (let i = 1; i < route.length; i++) {
          const lineFeature = new Feature(
            new LineString([
              [route[i - 1][0], -route[i - 1][1]],
              [route[i][0], -route[i][1]],
            ])
          );
          lineFeature.setStyle(lineStyle);
          features.push(lineFeature);
        }

        const vectorLayer = new VectorLayer({
          source: new VectorSource({
            features: features,
          }),
        });

        map.addLayer(vectorLayer);
        deliveryLayer.current = vectorLayer;
      } else if (markers?.length) {
        const source = new VectorSource({ features: markers.map(([x, z]) => new Feature(new Point([x, -z]))) });
        const layer = new VectorLayer({
          source,
          style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: "#f39621" }), stroke: new Stroke({ color: "white", width: 2 }) }) }),
        });
        map.addLayer(layer);
        deliveryLayer.current = layer;
        map.getView().fit(source.getExtent(), { padding: [90, 35, 35, 35], maxZoom: 5 });
      }

      if (points !== undefined && points !== null && points.length !== 0 && (pointsRef.current !== points || orangeOnlyRef.current !== showOrangeOnly)) {
        const zoom = map.getView().getZoom();

        pointsRef.current = points;
        orangeOnlyRef.current = showOrangeOnly;

        const pointFeatures = points
          .filter(point => !showOrangeOnly || point.color === "#f39621")
          .map(point => {
            const pointFeature = new Feature({ geometry: new Point([point.x, -point.y]), info: point });
            pointFeature.setStyle(
              new Style({
                image: new CircleStyle({
                  radius: 5,
                  fill: new Fill({ color: point.color !== undefined ? point.color : "#158CFB" }),
                  stroke: new Stroke({ color: "#000000", width: 1 }), // Add a black border
                }),
              })
            );
            return pointFeature;
          });

        const dataSource = new VectorSource({
          features: pointFeatures,
        });

        if (!pointsLayer.current) {
          pointsLayer.current = new VectorLayer({
            source: dataSource,
            minZoom: 6,
            maxZoom: 8,
          });
          map.addLayer(pointsLayer.current);
        } else {
          pointsLayer.current.setSource(dataSource);
        }

        let oldHeatmapLayer = heatmapLayer.current;
        heatmapLayer.current = new HeatmapLayer({
          source: dataSource,
          minZoom: 0,
          maxZoom: 6,
        });
        heatmapLayer.current.setOpacity(0.8);
        if (zoom <= 2) {
          heatmapLayer.current.setBlur(2);
          heatmapLayer.current.setRadius(2);
        } else if (zoom <= 4) {
          heatmapLayer.current.setBlur(5);
          heatmapLayer.current.setRadius(5);
        } else {
          heatmapLayer.current.setBlur(15);
          heatmapLayer.current.setRadius(8);
        }
        map.addLayer(heatmapLayer.current);
        map.renderSync();
        if (oldHeatmapLayer && map.getLayers().getArray().includes(oldHeatmapLayer)) {
          setTimeout(function () {
            map.removeLayer(oldHeatmapLayer);
          }, 10);
        }
      }

      map.getView().on("change:resolution", () => {
        const zoom = map.getView().getZoom();

        if (!pointsLayer.current || !heatmapLayer.current) {
          return;
        }

        if (zoom <= 2) {
          heatmapLayer.current.setBlur(2);
          heatmapLayer.current.setRadius(2);
        } else if (zoom <= 4) {
          heatmapLayer.current.setBlur(5);
          heatmapLayer.current.setRadius(5);
        } else {
          heatmapLayer.current.setBlur(15);
          heatmapLayer.current.setRadius(8);
        }
      });

      if (onPointClick !== undefined) {
        map.on("pointermove", function (evt) {
          if (evt.dragging || pointsLayer.current === undefined || !map.getLayers().getArray().includes(pointsLayer.current)) {
            return;
          }
          const pixel = map.getEventPixel(evt.originalEvent);
          const hit = map.hasFeatureAtPixel(pixel);
          if (hit) {
            map.getTarget().style.cursor = "pointer";
          } else {
            map.getTarget().style.cursor = "";
          }
        });

        map.on("click", function (evt) {
          if (evt.dragging || pointsLayer.current === undefined || !map.getLayers().getArray().includes(pointsLayer.current)) {
            return;
          }
          const pixel = map.getEventPixel(evt.originalEvent);
          const hit = map.hasFeatureAtPixel(pixel);
          if (hit) {
            map.forEachFeatureAtPixel(pixel, feature => {
              const featureProperties = feature.getProperties();
              onPointClick(featureProperties.info);
            });
          }
        });
      }

      if (onBoundaryChange !== undefined) {
        map.on("moveend", () => {
          const view = map.getView();
          const center = view.getCenter();
          const resolution = view.getResolution();
          const size = map.getSize();
          const width = size[0] * resolution;
          const height = size[1] * resolution;
          const extent = [center[0] - width / 2, center[1] - height / 2, center[0] + width / 2, center[1] + height / 2];
          const boundary = {
            x1: parseInt(extent[0]),
            y1: parseInt(-extent[3]),
            x2: parseInt(extent[2]),
            y2: parseInt(-extent[1]),
          };
          onBoundaryChange(boundary);
        });
      }

    }

    doLoad({ tilesUrl, route, points, showOrangeOnly });
    return () => { cancelled = true; };
  }, [apiPath, tilesUrl, route, markers, points, showOrangeOnly]);

  return (
    <div style={{ borderRadius: "10px", overflow: "hidden", height: "600px", ...style }}>
      <div ref={mapContainerRef} style={{ position: "relative", width: "100%", height: "100%", background: "#484E66" }}>
        <Typography variant="body2" sx={{ position: "absolute", zIndex: 1, margin: "5px", maxWidth: "calc(100% - 10px)", boxSizing: "border-box", p: "4px 6px", borderRadius: "4px", backgroundColor: "rgba(0,0,0,0.65)", color: "white" }}>
          {title}
          {mapError && <><br />{tr("map_temporarily_unavailable")}</>}
        </Typography>
        {route !== undefined && route !== null && route.length === 0 && !markers?.length && <div style={{ backgroundColor: "rgb(0,0,0,0.5)", height: "100%", width: "100%" }}></div>}
      </div>
    </div>
  );
};

export default TileMap;
