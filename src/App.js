import React, { useState, useEffect } from "react";
import WebPlayer from "./components/WebPlayer/WebPlayer";
import Login from "./components/Login";
import MainBox from "./components/MainBox";
import LeftBoxes from "./components/LeftBoxes";
import "./styles/App.css";

function App() {
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedPlaylist, setSelectedPlaylist] = useState({
    id: null,
    coverImg: null,
    title: null,
    owner: null,
    publicity: null,
  });

  const [savedTracks, setSavedTracks] = useState(null);

  //console.log("selectedPlaylist from app");
  //console.log(selectedPlaylist);

  const playlistItemsController = new AbortController();

  const cancelFetches = () => {
    playlistItemsController.abort();
  };

  useEffect(() => {
    async function getToken() {
      const response = await fetch("/auth/token");
      const json = await response.json();
      setToken(json.access_token);
    }

    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      async function getCurrentUserProfile() {
        const response = await fetch("/auth/user/getCurrentUsersProfile");
        const json = await response.json();
        //console.log(json);
        setCurrentUser(json);
      }
      getCurrentUserProfile();
      getCombinedSavedTracks(0);
    }
  }, [token]);

  const getCombinedSavedTracks = async (offset, allItems = []) => {
    try {
      const response = await fetch(
        `/auth/playlist/getCombinedSavedTracks/?limit=50&offset=${offset}`,
        {
          signal: playlistItemsController.signal,
        }
      );
      const data = await response.json();
      if (data.error) {
        setSavedTracks(null);
      } else {
        const updatedItems = [...allItems, ...data.items];
        data.items = updatedItems;
        setSavedTracks(data);
        if (data.next) {
          getCombinedSavedTracks(data.offset + 50, updatedItems);
        } else {
          console.log("finished");
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Error retrieving combined saved tracks:", error);
      } else {
        console.error("Error retrieving combined saved tracks:", error);
        setSavedTracks(null);
      }
    }
  };

  if (token === "") {
    return <Login />;
  } else {
    return (
      <div className="App">
        <LeftBoxes
          setSelectedPlaylist={setSelectedPlaylist}
          cancelFetches={cancelFetches}
        />
        <MainBox
          selectedPlaylist={selectedPlaylist}
          playlistItemsController={playlistItemsController}
        />
        <WebPlayer token={token} />
      </div>
    );
  }
}

export default App;
