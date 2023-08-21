import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";
import "../styles/DisplayPlaylistComponent.css";

function PlaylistInfo() {
  const [inputValue, setInputValue] = useState("");
  const [playlist, setPlaylist] = useState(null);
  const [artists, setArtists] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);

  const getPlaylistinfo = async (id) => {
    try {
      const response = await fetch("/auth/getAllPlaylistTracks/" + id);
      const data = await response.json();
      if (data.error) {
        setPlaylist(null);
      } else {
        setPlaylist(data);
      }
      console.log(data);
    } catch (error) {
      console.error("Error retrieving playlist info:", error);
      setPlaylist(null);
    }
  };

  const getArtistsInfo = async (id) => {
    try {
      const response = await fetch("/auth/getMultipleArtists/" + id);
      const data = await response.json();
      if (data.error) {
        setArtists(null);
      } else {
        setArtists(data);
        //console.log("set data for artists")
      }
      //console.log(data);
      //console.log(artists);
    } catch (error) {
      console.error("Error retrieving artists info:", error);
      setArtists(null);
    }
  };

  const getTracksAudioFeatures = async (id) => {
    try {
      const response = await fetch(
        "/auth/getMultipleTracksAudioFeatures/" + id
      );
      const data = await response.json();
      if (data.error) {
        setAudioFeatures(null);
      } else {
        setAudioFeatures(data);
        //console.log("set data for audio features")
      }
      //console.log(data);
      //console.log(audioFeatures);
    } catch (error) {
      console.error("Error retrieving tracks audio features:", error);
      setAudioFeatures(null);
    }
  };

  useEffect(() => {
    if (playlist) {
      const artistIds = playlist.tracks.items
        .map((item) => item.track.artists[0].id)
        .join(",");
      getArtistsInfo(artistIds);

      const trackIds = playlist.tracks.items
        .map((item) => item.track.id)
        .join(",");
      //console.log("track ids: "+ trackIds)
      getTracksAudioFeatures(trackIds);
    }
  }, [playlist, inputValue]);

  return (
    <div className="Playlist">
      <div className="PlaylistInfo">
        <input
          name="mybutton"
          placeholder="Enter Playlist ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="Input"
        />
        <button
          className="btn-spotify"
          onClick={() => getPlaylistinfo(inputValue)}
        >
          Get info
        </button>
        {playlist !== null ? (
          <>
            <img
              src={playlist.images[0].url}
              className="now-playing__cover"
              alt=""
            />
            {playlist.name}
            <br />
            Followers: {playlist.followers.total}
          </>
        ) : (
          <></>
        )}
      </div>
      <div className="SongBox">
        {artists !== null && audioFeatures !== null
          ? playlist?.tracks?.items.map((item, index) => (
              <Track
                key={item.track.id}
                track={item.track}
                artist={artists.artists[index]}
                audioFeatures={audioFeatures.tracks[index]}
              />
            ))
          : playlist?.tracks?.items.map((item) => (
              <div key={item.track.id}>Loading...</div>
            ))}
      </div>
    </div>
  );
}

export default PlaylistInfo;
