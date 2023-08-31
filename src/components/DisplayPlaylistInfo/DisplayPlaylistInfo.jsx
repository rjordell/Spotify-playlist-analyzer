import React from "react";
import { useEffect, useState } from "react";
import TrackBox from "./TrackBox";
import InfoHeaderBox from "./InfoHeaderBox";
import "./DisplayPlaylistInfo.css";

function DisplayPlaylistInfo({ selectedPlaylist, playlistItemsController }) {
  //console.log(selectedPlaylist);
  const [combinedData, setCombinedData] = useState(null);
  const [original, setOriginalItems] = useState(null);
  const [displaySort, setDisplaySort] = useState(false);

  return (
    <div className="Playlist">
      <InfoHeaderBox
        playlist={selectedPlaylist}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
        original={original}
        displaySort={displaySort}
      />
      <TrackBox
        playlistId={selectedPlaylist.id}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
        setOriginalItems={setOriginalItems}
        setDisplaySort={setDisplaySort}
        playlistItemsController={playlistItemsController}
      />
    </div>
  );
}

export default DisplayPlaylistInfo;
