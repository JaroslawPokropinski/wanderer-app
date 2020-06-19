import React, { useState } from 'react';
import { Switch, Route, useHistory, Redirect } from 'react-router-dom';
import MapContainer from './MapContainer/MapContainer';
import {
  BottomNavigation,
  BottomNavigationAction,
  createMuiTheme,
  ThemeProvider,
  CssBaseline,
  useMediaQuery,
} from '@material-ui/core';
import { Restore, Favorite, LocationOn, Add, More } from '@material-ui/icons';

import './App.scss';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', { defaultMatches: true, noSsr: true });

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? 'dark' : 'light',
        },
      }),
    [prefersDarkMode],
  );

  const history = useHistory();
  const [value, setValue] = useState(history.location.pathname.substring(1) || 'map');

  return (
    <div className="app-root">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Switch>
          <Route path="/map">
            <MapContainer />
          </Route>
          <Route path="/new">{'New is working'}</Route>
          <Route path="/fav">{'Favorites is working'}</Route>
          <Route path="/hist">{'History is working'}</Route>
          <Route path="/more">{'More is working'}</Route>
          <Route path="/">
            <Redirect to="/map" />
          </Route>
        </Switch>
        {/*This div is workaround for wobbly behavior of navbar*/}
        <div>
          <BottomNavigation
            value={value}
            onChange={(event, newValue) => {
              history.push(`/${newValue}`);
              setValue(newValue);
            }}
          >
            <BottomNavigationAction label="Map" value="map" icon={<LocationOn />} />
            <BottomNavigationAction label="New" value="new" icon={<Add />} />
            <BottomNavigationAction label="Favorites" value="fav" icon={<Favorite />} />
            <BottomNavigationAction label="History" value="hist" icon={<Restore />} />
            <BottomNavigationAction label="More" value="more" icon={<More />} />
          </BottomNavigation>
        </div>
      </ThemeProvider>
    </div>
  );
}

export default App;
