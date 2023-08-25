import React, { useState, useEffect } from "react";
import WebPlayback from "./components/player/WebPlayback";
import Login from "./components/Login";
import MainBox from "./components/MainBox";
import LeftBoxes from "./components/LeftBoxes";
import "./styles/App.css";

function App() {
  const [token, setToken] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  //console.log("selectedPlaylist from app");
  //console.log(selectedPlaylist);

  useEffect(() => {
    async function getToken() {
      const response = await fetch("/auth/token");
      const json = await response.json();
      setToken(json.access_token);
    }

    getToken();
  }, []);

  if (token === "") {
    return <Login />;
  } else {
    return (
      <div className="App">
        <LeftBoxes onPlaylistClick={setSelectedPlaylist} />
        <MainBox selectedPlaylist={selectedPlaylist} />
        <WebPlayback token={token} />
      </div>
    );
  }
}

export default App;
