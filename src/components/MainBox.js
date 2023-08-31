import React from "react";
import DisplayPlaylistInfo from "./DisplayPlaylistInfo/DisplayPlaylistInfo";

function MainBox({ selectedPlaylist, playlistItemsController }) {
  //console.log("selectedPlaylist from mainbox");
  //console.log(selectedPlaylist);
  return (
    <div className="MainBox">
      {selectedPlaylist && (
        <DisplayPlaylistInfo
          selectedPlaylist={selectedPlaylist}
          playlistItemsController={playlistItemsController}
        />
      )}
    </div>
  );
}

export default MainBox;
