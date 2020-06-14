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

export const getPath = (
  flat: number,
  flng: number,
  tlat: number,
  tlng: number,
): Promise<{ coordinates: Array<[number, number]> }> => {
  return Axios.get(
    `http://www.yournavigation.org/api/1.0/gosmore.php?format=geojson&flat=${flat}&flon=${flng}&tlat=${tlat}&tlon=${tlng}&v=foot&fast=0&layer=mapnik`,
  );
};

// TODO: Implement finding routes
