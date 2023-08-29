import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";

function TrackBox({
  playlistId,
  setCombinedData,
  combinedData,
  original,
  setOriginalItems,
  setNumTracksFetched,
  numTracksFetched,
  setTracksLoaded,
  tracksLoaded,
  setNumOfTracksToFetch,
  playlistItemsController,
  artistsInfoController,
  tracksAudioFeaturesController,
}) {
  const [playlist, setPlaylist] = useState(null);
  const [artists, setArtists] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [filteredTracks, setFilteredTracks] = useState([]);

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
      if (error.name === "AbortError") {
        // todo request cancellation here
        console.error("Error retrieving playlist items:", error);
      } else {
        console.error("Error retrieving playlist items:", error);
        setPlaylist(null);
      }
    }
  };

  const getArtistsInfo = async (id) => {
    try {
      const response = await fetch("/auth/getMultipleArtists/" + id, {
        signal: artistsInfoController.signal,
      });
      const data = await response.json();
      if (data.error) {
        setArtists(null);
      } else {
        setArtists((prevArtists) => ({
          ...prevArtists,
          artists: [...(prevArtists?.artists || []), ...data.artists],
        }));
        setTracksLoaded(tracksLoaded + 1);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        // todo request cancellation here
        console.error("Error retrieving artists info:", error);
      } else {
        console.error("Error retrieving artists info:", error);
        setArtists(null);
      }
    }
  };

  const getTracksAudioFeatures = async (id) => {
    try {
      const response = await fetch(
        "/auth/getMultipleTracksAudioFeatures/" + id,
        {
          signal: tracksAudioFeaturesController.signal,
        }
      );
      const data = await response.json();
      if (data.error) {
        setAudioFeatures(null);
      } else {
        setAudioFeatures((prevAudioFeatures) => ({
          ...prevAudioFeatures,
          tracks: [...(prevAudioFeatures?.tracks || []), ...data.tracks],
        }));
        setTracksLoaded(tracksLoaded + 1);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        // todo request cancellation here
        console.error("Error retrieving tracks audio features:", error);
      } else {
        console.error("Error retrieving tracks audio features:", error);
        setAudioFeatures(null);
      }
    }
  };

  const combineData = async () => {
    if (artists && audioFeatures) {
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
      setOriginalItems(updatedPlaylist);
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
      getPlaylistItems(
        `/auth/getPlaylistItems/${playlistId}?limit=100&offset=0`
      );
    }
  }, [playlistId]);

  useEffect(() => {
    if (playlist) {
      console.log(playlist);
      const newTracks = playlist.items.slice(numTracksFetched);
      const filteredNewTracks = newTracks.filter((item) => {
        if (item.track === null) {
          setNumOfTracksToFetch((prevNumTracks) => prevNumTracks - 1);
          return false;
        }
        return true;
      });

      const updatedFilteredTracks = [...filteredTracks, ...filteredNewTracks];
      setFilteredTracks(updatedFilteredTracks);

      const artistIds = filteredNewTracks
        .map((item) => item.track.artists[0].id)
        .join(",");
      getArtistsInfo(artistIds);

      const trackIds = filteredNewTracks.map((item) => item.track.id).join(",");
      getTracksAudioFeatures(trackIds);

      setNumTracksFetched(playlist.items.length);
    }
  }, [playlist]);

  useEffect(() => {
    combineData();
  }, [artists, audioFeatures]);

  return (
    <div className="main-container tracks">
      {combinedData?.items.map((item) => (
        <Track key={item.track} track={item} />
      ))}
    </div>
  );
}

export default TrackBox;
