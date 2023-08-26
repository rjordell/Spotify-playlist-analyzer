import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";
import "../styles/DisplayPlaylistComponent.css";

function TrackBox({ playlistId }) {
  const [playlist, setPlaylist] = useState(null);
  const [artists, setArtists] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [combinedData, setCombinedData] = useState(null);
  const [filteredTracks, setFilteredTracks] = useState(null);

  //gotta move batching to frontend
  const getPlaylistItems = async (url, allItems = []) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) {
        setPlaylist(null);
      } else {
        const updatedItems = [...allItems, ...data.items];
        setPlaylist({ items: updatedItems });
        if (data.next) {
          // If there's a "next" page, recursively fetch it
          getPlaylistItems(
            `/auth/getPlaylistItems/${playlistId}?limit=100&offset=${
              data.offset + 100
            }`,
            updatedItems
          );
        }
      }
    } catch (error) {
      console.error("Error retrieving playlist items:", error);
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
      }
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
      }
    } catch (error) {
      console.error("Error retrieving tracks audio features:", error);
      setAudioFeatures(null);
    }
  };

  const combineData = async () => {
    const combinedTracks = filteredTracks.map((item, index) => {
      const trackWithArtist = {
        ...item.track,
        artists: [artists.artists[index]],
        ...audioFeatures.tracks[index],
      };
      return trackWithArtist;
    });
    const updatedPlaylist = {
      ...playlist,
      items: combinedTracks,
    };
    setCombinedData(updatedPlaylist);
  };

  useEffect(() => {
    if (playlistId) {
      setArtists(null);
      setAudioFeatures(null);
      setPlaylist(null);
      setCombinedData(null);
      getPlaylistItems(
        `/auth/getPlaylistItems/${playlistId}?limit=100&offset=0`
      );
    }
  }, [playlistId]);

  useEffect(() => {
    if (playlist && artists && audioFeatures) {
      combineData();
    }
  }, [artists, audioFeatures]);

  useEffect(() => {
    if (playlist) {
      console.log(playlist);
      const filteredTracks = playlist.items.filter(
        (item) => item.track !== null && item.track.artists.length > 0
      );
      setFilteredTracks(filteredTracks);

      const artistIds = filteredTracks
        .map((item) => item.track.artists[0].id)
        .join(",");
      getArtistsInfo(artistIds);

      const trackIds = filteredTracks.map((item) => item.track.id).join(",");
      getTracksAudioFeatures(trackIds);
    }
  }, [playlist]);

  return (
    <div className="SongBox">
      {console.log("cmbned data")}
      {console.log(combinedData)}
      {console.log("playlist")}
      {console.log(playlist)}
      {combinedData?.items.map((item) => (
        <Track key={item.track} track={item} />
      ))}
    </div>
  );
}

export default TrackBox;
