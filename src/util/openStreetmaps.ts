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

// TODO: Implement finding routes
