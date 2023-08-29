import React from "react";
import GoToMainMenuBox from "./GoToMainMenuBox";
import UserPlaylistsBox from "./UserPlaylists/UserPlaylistsBox";

function LeftBoxes({ onPlaylistClick, cancelFetches }) {
  return (
    <div className="LeftBoxes">
      <GoToMainMenuBox />
      <UserPlaylistsBox
        onPlaylistClick={onPlaylistClick}
        cancelFetches={cancelFetches}
      />
    </div>
  );
}

export default LeftBoxes;
