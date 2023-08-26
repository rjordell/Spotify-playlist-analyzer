import React from "react";
import { useState, useEffect } from "react";
import TrackBox from "./TrackBox";
import InfoHeaderBox from "./InfoHeaderBox";
import "../styles/DisplayPlaylistComponent.css";

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
