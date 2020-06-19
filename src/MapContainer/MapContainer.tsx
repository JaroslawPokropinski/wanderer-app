import React, { useState } from 'react';
import { Map, TileLayer } from 'react-leaflet';
import { LocationEvent } from 'leaflet';
import { getGeolocation } from '../util/openStreetmaps';

import './MapContainer.scss';

function MapContainer() {
  const [state, setState] = useState({
    lat: 0,
    lng: 0,
    zoom: 3,
  });

  const position = { lat: state.lat, lng: state.lng };

  getGeolocation()
    .then((position) => {
      setState({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        zoom: 16,
      });
    })
    .catch(() => null); // Silently ignore

  const onlocationfound = (ev: LocationEvent) => {
    setState({
      lat: ev.latlng.lat,
      lng: ev.latlng.lng,
      zoom: 16,
    });
  };

  return (
    <Map id="map-root" center={position} zoom={state.zoom} onlocationfound={onlocationfound}>
      <TileLayer
        attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </Map>
  );
}

export default MapContainer;
