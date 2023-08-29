import React from "react";
import { useEffect, useState } from "react";
import TrackBox from "./TrackBox";
import InfoHeaderBox from "./InfoHeaderBox";
import "./DisplayPlaylistInfo.css";

function DisplayPlaylistInfo({
  selectedPlaylist,
  playlistItemsController,
  artistsInfoController,
  tracksAudioFeaturesController,
}) {
  //console.log(selectedPlaylist);
  const [combinedData, setCombinedData] = useState(null);
  const [original, setOriginalItems] = useState(null);
  const [numTracksFetched, setNumTracksFetched] = useState(0);
  const [tracksLoaded, setTracksLoaded] = useState(0);
  const [numOfTracksToFetch, setNumOfTracksToFetch] = useState(0);
  const [displaySort, setDisplaySort] = useState(false);

  //setNumOfTracksToFetch(selectedPlaylist.tracks.total);

  /*
  if (combinedData) {
    console.log("selectedPlaylist");
    console.log(selectedPlaylist);
    console.log("combinedData");
    console.log(combinedData);
    console.log("combinedData length");
    console.log(combinedData.items.length);
  }
  */
  useEffect(() => {
    if (selectedPlaylist) {
      setNumOfTracksToFetch(selectedPlaylist.tracks.total);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    if (combinedData) {
      if (combinedData.items.length == numOfTracksToFetch) {
        setDisplaySort(true);
      }
    } else {
      setDisplaySort(false);
    }
  }, [combinedData, numOfTracksToFetch]);

  if (combinedData) {
    if (combinedData.items.length == selectedPlaylist.tracks.total) {
      console.log("fully loaded");
    } else {
      console.log("not fully loaded");
      console.log("selectedPlaylist length");
      console.log(selectedPlaylist.tracks.total);
      console.log("combinedData length");
      console.log(combinedData.items.length);
      console.log("numOfTracksToFetch");
      console.log(numOfTracksToFetch);
    }
  }

  return (
    <div className="Playlist">
      <InfoHeaderBox
        playlist={selectedPlaylist}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
        original={original}
        numOfTracks={numOfTracksToFetch}
        displaySort={displaySort}
      />
      <TrackBox
        playlistId={selectedPlaylist.id}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
        original={original}
        setOriginalItems={setOriginalItems}
        setNumTracksFetched={setNumTracksFetched}
        numTracksFetched={numTracksFetched}
        setTracksLoaded={setTracksLoaded}
        tracksLoaded={tracksLoaded}
        setNumOfTracksToFetch={setNumOfTracksToFetch}
        playlistItemsController={playlistItemsController}
        artistsInfoController={artistsInfoController}
        tracksAudioFeaturesController={tracksAudioFeaturesController}
      />
    </div>
  );
}

export default DisplayPlaylistInfo;
