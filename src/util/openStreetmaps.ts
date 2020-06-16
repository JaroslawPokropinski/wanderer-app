import Axios from 'axios';

export const getGeolocation = (): Promise<Position> => {
  return new Promise<Position>((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('Your browser does not support geolocation'));

    const onSuccess: PositionCallback = (position) => {
      resolve(position);
    };
    const onError: PositionErrorCallback = (positionError) => {
      reject(positionError);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError);
  });
};

export const getStartingNodes = (lat: number, lng: number): Promise<unknown> => {
  return Axios.get(
    `https://master.apis.dev.openstreetmap.org/api/0.6/map?bbox=${lng - 0.1},${lat - 0.1},${lng + 0.1},${lat + 0.1}`,
  );
};

type RoutingData = { coordinates: Array<[number, number]>; properties: { distance: string } };

export const getPath = (flat: number, flng: number, tlat: number, tlng: number): Promise<RoutingData> => {
  return Axios.get<RoutingData>(
    `https://wandering-application.herokuapp.com/api/1.0/gosmore.php?format=geojson&flat=${flat}&flon=${flng}&tlat=${tlat}&tlon=${tlng}&fast=0&layer=mapnik`, // &v=foot
  ).then((res) => res.data);
};

export function measure(lat1: number, lon1: number, lat2: number, lon2: number) {
  // generally used geo measurement function
  const R = 6378.137; // Radius of earth in KM
  const dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
  const dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d * 1000; // meters
}

// TODO: Implement finding routes
