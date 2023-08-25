import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";
import "../styles/DisplayPlaylistComponent.css";

function PlaylistInfo(props) {
  const [playlist, setPlaylist] = useState(null);
  const [artists, setArtists] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [combinedData, setCombinedData] = useState(null);

  //gotta move batching to frontend
  const getPlaylistinfo = async (id) => {
    try {
      const response = await fetch("/auth/getPlaylistInfo/" + id);
      const data = await response.json();
      console.log(data);
      if (data.error) {
        setPlaylist(null);
      } else {
        console.log("got playlist info");
        setPlaylist(data);
      }
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

  const combineData = async () => {
    const combinedTracks = playlist.tracks.items.map((item, index) => {
      const trackWithArtist = {
        ...item.track,
        artists: [artists.artists[index]],
        ...audioFeatures.tracks[index],
      };
      return trackWithArtist;
    });
    const updatedPlaylist = {
      ...playlist,
      tracks: {
        ...playlist.tracks,
        items: combinedTracks,
      },
    };
    setCombinedData({
      playlist: updatedPlaylist,
    });
    //console.log(combinedData);
  };

  useEffect(() => {
    if (props.playlistId) {
      setArtists(null);
      setAudioFeatures(null);
      setPlaylist(null);
      setCombinedData(null);
      getPlaylistinfo(props.playlistId);
    }
  }, [props.playlistId]);

  useEffect(() => {
    if (playlist && artists && audioFeatures) {
      combineData();
    }
  }, [artists, audioFeatures]);

  useEffect(() => {
    if (playlist) {
      const artistIds = playlist.tracks.items
        .map((item) => (console.log(item), item.track.artists[0].id))
        .join(",");
      getArtistsInfo(artistIds);

      const trackIds = playlist.tracks.items
        .map((item) => item.track.id)
        .join(",");
      //console.log("track ids: "+ trackIds)
      getTracksAudioFeatures(trackIds);
    }
  }, [playlist]);

  return (
    <div className="Playlist">
      <div className="PlaylistInfo">
        {playlist && (
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
        )}
      </div>
      <div className="SongBox">
        {combinedData !== null
          ? combinedData?.playlist?.tracks?.items.map(
              (item) => (
                (<Track key={item.id} track={item} />), console.log(item)
              )
            )
          : playlist?.tracks?.items.map((item) => <div>Loading...</div>)}
      </div>
    </div>
  );
}

export default PlaylistInfo;
