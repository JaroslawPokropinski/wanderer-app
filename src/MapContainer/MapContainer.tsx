import React, { useState, useEffect } from 'react';
import { Map, TileLayer, Marker, Polyline } from 'react-leaflet';
import { LocationEvent } from 'leaflet';
import { getGeolocation, createGraph, findCycle } from '../util/openStreetmaps';
import { notEmpty } from '../util/arrayUtil';

import './MapContainer.scss';

function MapContainer() {
  const [state, setState] = useState({
    lat: 0,
    lng: 0,
    zoom: 3,
    markers: new Array<[number, number]>(),
    path: new Array<[number, number]>(),
  });

  const position = { lat: state.lat, lng: state.lng };

  useEffect(() => {
    getGeolocation()
      .then((position) => {
        const { latitude, longitude } = position.coords;
        setState((state) => ({
          ...state,
          lat: latitude,
          lng: longitude,
          zoom: 16,
        }));
        return createGraph(latitude, longitude);
      })
      .then((g) => {
        console.log(g);
        const cycle = findCycle(g.edges[0].nodes[0], g, 2.0, 2.5);
        console.log(cycle?.length);
        const path =
          cycle?.nodeIds
            .map((v) => g.nodes.get(v))
            .filter(notEmpty)
            .map((v) => (v.lat != null && v.lon != null ? ([v.lat, v.lon] as [number, number]) : null))
            .filter(notEmpty) ?? [];

        setState((state) => ({
          ...state,
          path,
        }));
      })
      .catch(() => null); // Silently ignore
  }, []);

  const onlocationfound = (ev: LocationEvent) => {
    setState((state) => ({
      ...state,
      lat: ev.latlng.lat,
      lng: ev.latlng.lng,
      zoom: 16,
    }));
  };

  return (
    <Map id="map-root" center={position} zoom={state.zoom} onlocationfound={onlocationfound}>
      <TileLayer
        attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {state.markers.map((m, i) => (
        <Marker key={i} position={m} />
      ))}
      <Polyline positions={state.path} />
    </Map>
  );
}

export default MapContainer;
