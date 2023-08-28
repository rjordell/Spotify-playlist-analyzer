import React from "react";
import PlaylistBox from "./DisplayPlaylistInfo/DisplayPlaylistInfo";

function MainBox({ selectedPlaylist }) {
  //console.log("selectedPlaylist from mainbox");
  //console.log(selectedPlaylist);
  return (
    <div className="MainBox">
      {selectedPlaylist && <PlaylistBox selectedPlaylist={selectedPlaylist} />}
    </div>
  );
}

export default MainBox;
