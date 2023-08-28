import React from "react";
import { useState } from "react";
import TrackBox from "./TrackBox";
import InfoHeaderBox from "./InfoHeaderBox";
import "./DisplayPlaylistInfo.css";

function PlaylistBox({ selectedPlaylist }) {
  //console.log(selectedPlaylist);
  const [combinedData, setCombinedData] = useState(null);
  const [original, setOriginalItems] = useState(null);

  return (
    <div className="Playlist">
      <InfoHeaderBox
        playlist={selectedPlaylist}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
        original={original}
      />
      <TrackBox
        playlistId={selectedPlaylist.id}
        total={selectedPlaylist.tracks.total}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
        original={original}
        setOriginalItems={setOriginalItems}
      />
    </div>
  );
}

export default PlaylistBox;
