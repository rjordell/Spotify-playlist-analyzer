import React from "react";
import { useState } from "react";
import TrackBox from "./TrackBox";
import InfoHeaderBox from "./InfoHeaderBox";
import "./DisplayPlaylistInfo.css";

function PlaylistBox({ selectedPlaylist }) {
  //console.log(selectedPlaylist);
  const [combinedData, setCombinedData] = useState(null);

  return (
    <div className="Playlist">
      <InfoHeaderBox
        playlist={selectedPlaylist}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
      />
      <TrackBox
        playlistId={selectedPlaylist.id}
        total={selectedPlaylist.tracks.total}
        setCombinedData={setCombinedData}
        combinedData={combinedData}
      />
    </div>
  );
}

export default PlaylistBox;
