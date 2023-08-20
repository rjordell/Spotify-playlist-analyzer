import React from "react";

function Playlist(props) {
  return (
    <div className="playlistContainer">
      <>
        <img
          src={props.playlist.images[0].url}
          className="playlists_cover"
          alt=""
        />
        Name: {props.playlist.name}
        <br />
        Owner: {props.playlist.owner.display_name}
      </>
    </div>
  );
}

export default Playlist;
