import React from "react";
import { useState, useEffect } from "react";
import Playlist from "./Playlist";
import "../styles/UserPlaylistsBox.css";

function UserPlaylistsBox({ onPlaylistClick }) {
  const [inputValue, setInputValue] = useState("");
  const [playlists, setPlaylists] = useState(null);

  const getCurrentUsersPlaylists = async () => {
    try {
      const response = await fetch("/auth/getCurrentUsersPlaylists/");
      const data = await response.json();
      if (data.error) {
        setPlaylists(null);
      } else {
        setPlaylists(data);
      }
      console.log("current users playlsits");
      console.log(data);
    } catch (error) {
      console.error("Error retrieving current user's playlists:", error);
      setPlaylists(null);
    }
  };

  const getUsersPlaylists = async (id) => {
    try {
      const response = await fetch("/auth/getUsersPlaylists/" + id);
      const data = await response.json();
      if (data.error) {
        setPlaylists(null);
      } else {
        setPlaylists(data);
      }
      console.log(data);
    } catch (error) {
      console.error("Error retrieving user's playlists:", error);
      setPlaylists(null);
    }
  };

  useEffect(() => {
    getCurrentUsersPlaylists();
  }, []);

  return (
    <div className="UserPlaylistsBox">
      <div className="UserInfo">
        <input
          name="mybutton"
          placeholder="Enter User ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="Input"
        />
        <button
          className="btn-spotify"
          onClick={() => getUsersPlaylists(inputValue)}
        >
          Get info
        </button>
      </div>
      <div className="PlaylistsBox">
        {playlists !== null ? (
          playlists?.items.map((item) => (
            <Playlist key={item.id} playlist={item} onClick={onPlaylistClick} />
          ))
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

export default UserPlaylistsBox;
