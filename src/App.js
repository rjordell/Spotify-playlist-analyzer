import React, { useState, useEffect } from 'react';
import WebPlayback from './components/player/WebPlayback'
import Login from './components/Login'
import MainBox from './components/MainBox';
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
          <MainBox/>
          <WebPlayback token={token}/>
      </div>
    );
  }

}


export default App;
