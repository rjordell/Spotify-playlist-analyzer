import React, { useState, useEffect } from 'react';
import WebPlayback from './WebPlayback'
import Login from './Login'
import PlaylistInfo from './PlaylistInfo'
import './App.css';

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
      <div>
        <div>
          <PlaylistInfo/>
        </div>
        <div>
          <WebPlayback token={token}/>
        </div>
      </div>
    );
  }

}


export default App;
