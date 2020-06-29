import React from 'react';
import GenericsStore from './generics';
import RouteStore from './route';

export const storesContext = React.createContext({
  genericsStore: new GenericsStore(),
  routeStore: new RouteStore(),
});

export const useStores = () => React.useContext(storesContext);
