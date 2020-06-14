import React from 'react';
import { Switch, Route } from 'react-router-dom';
import MapContainer from './MapContainer/MapContainer';

import './App.css';

function App() {
  return (
    <Switch>
      <Route path="/">
        <MapContainer />
      </Route>
    </Switch>
  );
}

export default App;
