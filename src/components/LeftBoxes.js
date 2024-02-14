import React from "react";
import GoToMainMenuBox from "./GoToMainMenuBox";
import UserPlaylistsBox from "./UserPlaylists/UserPlaylistsBox";

function LeftBoxes({ setSelectedPlaylist, cancelFetches, currentUser }) {
  return (
    <div className="LeftBoxes">
      <GoToMainMenuBox />
      <UserPlaylistsBox
        setSelectedPlaylist={setSelectedPlaylist}
        cancelFetches={cancelFetches}
        currentUser={currentUser}
      />
    </div>
  );
}

export default LeftBoxes;
