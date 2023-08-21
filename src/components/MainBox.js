import React from "react";
import PlaylistInfo from "./PlaylistInfo";

function MainBox({ selectedPlaylistId }) {
  return (
    <div className="MainBox">
      {selectedPlaylistId && <PlaylistInfo playlistId={selectedPlaylistId} />}
    </div>
  );
}

export default MainBox;
