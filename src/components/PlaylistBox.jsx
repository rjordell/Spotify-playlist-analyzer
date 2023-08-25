import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";
import InfoHeaderBox from "./InfoHeaderBox";
import "../styles/DisplayPlaylistComponent.css";

function PlaylistBox({ selectedPlaylist }) {
  console.log("selectedPlaylist from playlistInfo");
  console.log(selectedPlaylist);
  const [playlist, setPlaylist] = useState(null);
  const [artists, setArtists] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [combinedData, setCombinedData] = useState(null);
  const [filteredTracks, setFilteredTracks] = useState(null);

  //gotta move batching to frontend
  const getPlaylistinfo = async (id) => {
    try {
      const response = await fetch("/auth/getPlaylistInfo/" + id);
      const data = await response.json();
      //console.log(data);
      if (data.error) {
        setPlaylist(null);
      } else {
        //console.log("got playlist info");
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
    //console.log("playlist");
    //console.log(playlist);
    //console.log("filteredTracks");
    //console.log(filteredTracks);
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
      tracks: {
        ...playlist.tracks,
        items: combinedTracks,
      },
    };
    setCombinedData(updatedPlaylist);
    //console.log("combinedData");
    //console.log(playlist);
  };

  useEffect(() => {
    if (selectedPlaylist) {
      console.log(selectedPlaylist);
      setArtists(null);
      setAudioFeatures(null);
      setPlaylist(null);
      setCombinedData(null);
      getPlaylistinfo(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    if (playlist && artists && audioFeatures) {
      combineData();
      //console.log("combinedData2?");
      //console.log(combinedData);
    }
  }, [artists, audioFeatures]);

  useEffect(() => {
    if (playlist) {
      //console.log("old playlist");
      //console.log(playlist);
      const filteredTracks = playlist.tracks.items.filter(
        (item) => item.track !== null && item.track.artists.length > 0
      );
      setFilteredTracks(filteredTracks);
      //console.log("filtered tracks");
      //console.log(filteredTracks);

      const artistIds = filteredTracks
        .map((item) => /*console.log(item),*/ item.track.artists[0].id)
        .join(",");
      getArtistsInfo(artistIds);

      const trackIds = filteredTracks.map((item) => item.track.id).join(",");
      //console.log("track ids: "+ trackIds)
      getTracksAudioFeatures(trackIds);
    }
  }, [playlist]);

  return (
    <div className="Playlist">
      <InfoHeaderBox playlist={selectedPlaylist} />
      <div className="SongBox">
        {combinedData !== null
          ? combinedData?.tracks?.items.map((item) => (
              <Track key={item.id} track={item} />
            ))
          : playlist?.tracks?.items.map((item) => <div>Loading...</div>)}
      </div>
    </div>
  );
}

export default PlaylistBox;
