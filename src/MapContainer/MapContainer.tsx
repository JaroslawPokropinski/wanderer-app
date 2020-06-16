import './MapContainer.css';
import React, { useState, useEffect } from 'react';
import { Map, TileLayer, Marker, Polyline } from 'react-leaflet';
import { LocationEvent } from 'leaflet';
import { getGeolocation, getPath } from '../util/openStreetmaps';

const getRandomTriangleAt = (at: number) => {
  const angle = Math.random() * Math.PI * 2;
  const length = 0.5;
  const kmPoints: Array<[number, number]> = [
    [0, 0],
    [length * 1.22, -length / 2],
    [length * 1.22, length / 2],
  ].map((v) => {
    return [v[0] * Math.cos(angle) - v[1] * Math.sin(angle), v[0] * Math.sin(angle) + v[1] * Math.cos(angle)];
  });

  return kmPoints.map(convertKmToAngles, at);
};

const convertKmToAngles = (vec: [number, number], at: number): [number, number] => {
  const lat = vec[0] / 110.547;
  const lon = vec[1] / (111.32 * Math.cos(((at + lat) * Math.PI) / 180));
  return [lat, lon];
};

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
        const coords = getRandomTriangleAt(position.coords.latitude).map(
          (v) => [v[0] + position.coords.latitude, v[1] + position.coords.longitude] as [number, number],
        );

        setState((state) => ({
          ...state,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          zoom: 16,
          markers: coords,
        }));
        const promises = coords.map((v, i) =>
          getPath(coords[i][0], coords[i][1], coords[(i + 1) % coords.length][0], coords[(i + 1) % coords.length][1]),
        );
        return Promise.all(promises);
      })
      .then((paths) => {
        const path: [number, number][] = paths
          .reduce<Array<[number, number]>>((p, current) => p.concat(current.coordinates), [])
          .map((v) => [v[1], v[0]]);

        console.log(paths.reduce<number>((p, curr) => p + parseFloat(curr.properties.distance), 0));
        console.log(path);

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
      {/* {state.markers.map((m, i) => (
        (i === 0)
        ? null
        : 
      ))} */}
      {/* {state.markers.length > 0 ? <Polyline positions={[...state.markers, state.markers[0]]} /> : null} */}
      <Polyline positions={state.path} />
    </Map>
  );
}

export default MapContainer;
