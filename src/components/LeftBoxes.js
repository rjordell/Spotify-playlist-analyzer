import React from "react";
import GoToMainMenuBox from "./GoToMainMenuBox";
import UserPlaylistsBox from "./UserPlaylists/UserPlaylistsBox";

function LeftBoxes({ onPlaylistClick }) {
  return (
    <div className="LeftBoxes">
      <GoToMainMenuBox />
      <UserPlaylistsBox onPlaylistClick={onPlaylistClick} />
    </div>
  );
}

export default LeftBoxes;
