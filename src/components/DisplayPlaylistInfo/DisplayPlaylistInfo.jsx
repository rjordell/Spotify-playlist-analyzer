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
  const [numOfTracksToFetch, setNumOfTracksToFetch] = useState(0);
  const [displaySort, setDisplaySort] = useState(false);

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
        setOriginalItems={setOriginalItems}
        setNumOfTracksToFetch={setNumOfTracksToFetch}
        playlistItemsController={playlistItemsController}
        artistsInfoController={artistsInfoController}
        tracksAudioFeaturesController={tracksAudioFeaturesController}
      />
    </div>
  );
}

export default DisplayPlaylistInfo;
