import React from "react";
import GoToMainMenuBox from "./GoToMainMenuBox";
import UserPlaylistsBox from "./UserPlaylists/UserPlaylistsBox";

function LeftBoxes({ setSelectedPlaylist, cancelFetches }) {
  return (
    <div className="LeftBoxes">
      <GoToMainMenuBox />
      <UserPlaylistsBox
        setSelectedPlaylist={setSelectedPlaylist}
        cancelFetches={cancelFetches}
      />
    </div>
  );
}

export default LeftBoxes;
