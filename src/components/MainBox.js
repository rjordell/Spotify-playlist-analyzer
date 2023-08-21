import React from "react";
import PlaylistInfo from "./PlaylistInfo";

function MainBox({ selectedPlaylistId }) {
  return (
    <div className="MainBox">
      <PlaylistInfo playlistId={selectedPlaylistId} />
    </div>
  );
}

export default MainBox;
