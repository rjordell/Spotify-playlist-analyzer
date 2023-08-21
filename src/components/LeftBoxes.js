import React from "react";
import GoToMainMenuBox from "./GoToMainMenuBox";
import UserPlaylistsBox from "./UserPlaylistsBox";

function LeftBoxes({ onPlaylistClick }) {
  return (
    <div className="LeftBoxes">
      <GoToMainMenuBox />
      <UserPlaylistsBox onPlaylistClick={onPlaylistClick} />
    </div>
  );
}

export default LeftBoxes;
