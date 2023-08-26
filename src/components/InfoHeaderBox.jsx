import React from "react";
import { useState, useEffect } from "react";
import "../styles/DisplayPlaylistComponent.css";

function InfoHeaderBox({ playlist }) {
  return (
    <div className="PlaylistInfo">
      <img src={playlist.images[0].url} className="now-playing__cover" alt="" />
      {playlist.name}
      <br />
      Songs: {playlist.tracks.total}
    </div>
  );
}

export default InfoHeaderBox;
