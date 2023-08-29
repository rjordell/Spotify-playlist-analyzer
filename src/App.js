import React, { useState, useEffect } from "react";
import WebPlayer from "./components/WebPlayer/WebPlayer";
import Login from "./components/Login";
import MainBox from "./components/MainBox";
import LeftBoxes from "./components/LeftBoxes";
import "./styles/App.css";

function App() {
  const [token, setToken] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  //console.log("selectedPlaylist from app");
  //console.log(selectedPlaylist);

  const playlistItemsController = new AbortController();
  const artistsInfoController = new AbortController();
  const tracksAudioFeaturesController = new AbortController();

  const cancelFetches = () => {
    playlistItemsController.abort();
    artistsInfoController.abort();
    tracksAudioFeaturesController.abort();
  };

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
        <LeftBoxes
          onPlaylistClick={setSelectedPlaylist}
          cancelFetches={cancelFetches}
        />
        <MainBox
          selectedPlaylist={selectedPlaylist}
          playlistItemsController={playlistItemsController}
          artistsInfoController={artistsInfoController}
          tracksAudioFeaturesController={tracksAudioFeaturesController}
        />
        <WebPlayer token={token} />
      </div>
    );
  }
}

export default App;
