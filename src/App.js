import React, { useState, useEffect } from 'react';
import WebPlayback from './components/player/WebPlayback'
import Login from './components/Login'
import PlaylistInfo from './components/PlaylistInfo'
import TrackInfo from './components/TrackInfo'
import './styles/App.css';

function App() {

  const [token, setToken] = useState('');

  useEffect(() => {

    async function getToken() {
      const response = await fetch('/auth/token');
      const json = await response.json();
      setToken(json.access_token);
    }

    getToken();

  }, []);

  if(token === ''){
      return (<Login/>);
  }
  else{
    return(
      <div className="App">
        <div>
          <PlaylistInfo/>
        </div>
        <div>
          {//<WebPlayback token={token}/> 
          }
        </div>
      </div>
    );
  }

}


export default App;
