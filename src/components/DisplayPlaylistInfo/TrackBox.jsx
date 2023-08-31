import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";

function TrackBox({
  playlistId,
  setCombinedData,
  combinedData,
  setOriginalItems,
  setNumOfTracksToFetch,
  playlistItemsController,
  artistsInfoController,
  tracksAudioFeaturesController,
}) {
  const [playlist, setPlaylist] = useState(null);
  const [artists, setArtists] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [numTracksFetched, setNumTracksFetched] = useState(0);

  const [playlistTracks, setPlaylistTracks] = useState(null);

  const getPlaylistItems = async (url, allItems = []) => {
    try {
      const response = await fetch(url, {
        signal: playlistItemsController.signal,
      });
      const data = await response.json();
      if (data.error) {
        setPlaylist(null);
      } else {
        const updatedItems = [...allItems, ...data.items];
        setPlaylist({ items: updatedItems });
        if (data.next) {
          getPlaylistItems(
            `/auth/playlist/getPlaylistItems/${playlistId}?limit=100&offset=${
              data.offset + 100
            }`,
            updatedItems
          );
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Error retrieving playlist items:", error);
      } else {
        console.error("Error retrieving playlist items:", error);
        setPlaylist(null);
      }
    }
  };

  const getCombinedData = async (offset) => {
    try {
      const response = await fetch(
        `/auth/playlist/getCombinedData/${playlistId}?limit=100&offset=${offset}`,
        {
          signal: artistsInfoController.signal,
        }
      );
      const data = await response.json();
      if (data.error) {
        console.log("got error");
        console.log(data.error);
        setPlaylistTracks(null);
      } else {
        console.log("no error: playlist");
        console.log(data);

        const updatedTracks = {
          ...playlistTracks.items,
          ...data.tracks,
        };

        setPlaylistTracks({ items: updatedTracks });
        console.log("playlist with updated tracks");
        console.log(playlistTracks);
        if (data.next) {
          getCombinedData(data.offset + 100);
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Error retrieving combined data:", error);
      } else {
        console.error("Error retrieving combined data:", error);
        setPlaylistTracks(null);
      }
    }
  };

  useEffect(() => {
    if (playlistId) {
      setArtists(null);
      setAudioFeatures(null);
      setPlaylist(null);
      setFilteredTracks([]);
      setCombinedData(null);
      setNumTracksFetched(0);
      /*
      getPlaylistItems(
        `/auth/playlist/getPlaylistItems/${playlistId}?limit=100&offset=0`
      );
      */
      setPlaylistTracks(null);
      getCombinedData(0);
    }
  }, [playlistId]);

  return (
    <div className="main-container tracks">
      {playlistTracks?.items.map((item) => (
        <Track key={item.track} track={item} />
      ))}
    </div>
  );
}

export default TrackBox;
