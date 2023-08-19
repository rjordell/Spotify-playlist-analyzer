import React from "react";

function Playlist(props) {
  console.log("reached component");
  console.log(props);
  return (
    <div className="main-wrapper3">
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
