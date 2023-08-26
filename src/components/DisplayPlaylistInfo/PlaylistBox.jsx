import React from "react";
import TrackBox from "./TrackBox";
import InfoHeaderBox from "./InfoHeaderBox";
import "./DisplayPlaylistInfo.css";

function PlaylistBox({ selectedPlaylist }) {
  console.log(selectedPlaylist);
  return (
    <div className="Playlist">
      <InfoHeaderBox playlist={selectedPlaylist} />
      <TrackBox
        playlistId={selectedPlaylist.id}
        total={selectedPlaylist.tracks.total}
      />
    </div>
  );
}

export default PlaylistBox;
