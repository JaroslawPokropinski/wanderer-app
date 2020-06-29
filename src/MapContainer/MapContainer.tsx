import React, { useState, useEffect } from 'react';
import { Map, TileLayer, Marker, Polyline } from 'react-leaflet';
import { LocationEvent } from 'leaflet';
import { getGeolocation, createGraph, toGraph } from '../util/openStreetmaps';
import { observer } from 'mobx-react';
import { useStores } from '../stores';

import './MapContainer.scss';
import { findCycle, getClosestNode } from '../util/graph';

const MapContainer = observer(() => {
  const { routeStore } = useStores();
  const [state, setState] = useState({
    lat: 0,
    lng: 0,
    zoom: 3,
    markers: new Array<[number, number]>(),
    path: new Array<[number, number]>(),
  });

  const position = { lat: state.lat, lng: state.lng };

  useEffect(() => {
    routeStore.isGenerated = false;
    let latitude = 0;
    let longitude = 0;
    getGeolocation()
      .then((position) => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        setState((state) => ({
          ...state,
          lat: latitude,
          lng: longitude,
          zoom: 16,
        }));
        return createGraph(latitude, longitude);
      })
      .then((g) => {
        const graph = toGraph(g);
        const startingNode = graph.edges[0].nodes[0];
        // const startingNode = getClosestNode(graph, latitude, longitude);

        return findCycle(startingNode, graph, 5.0, 10.0);
      })
      .then((cycle) => {
        console.log(cycle);
        const path = cycle?.nodes.map((v) => [v.lat, v.lon] as [number, number]) ?? [];

        setState((state) => ({
          ...state,
          lat: cycle?.center.lat ?? state.lat,
          lng: cycle?.center.lon ?? state.lng,
          path,
        }));
        routeStore.isGenerated = true;
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
});

export default MapContainer;
