import React from 'react';
import GoToMainMenuBox from './GoToMainMenuBox';
import UserPlaylistsBox from './UserPlaylistsBox';

function LeftBoxes() {
    return (
        <div className="LeftBoxes">
            <GoToMainMenuBox/>
            <UserPlaylistsBox/>
        </div>
    );
}

export default LeftBoxes;

