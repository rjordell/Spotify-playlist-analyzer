import React from "react";

function Playlist(props) {
  const handleClick = () => {
    console.log(props.playlist);
    props.onClick(props.playlist);
  };
  return (
    <div className="playlistContainer" onClick={handleClick}>
      <div className="imageAndTitle">
        <div className="imageCovers">
          <img
            src={props.playlist.images[0].url}
            className="playlists_cover"
            alt=""
          />
        </div>

        <div className="now-playing__side">
          <div className="containerHeader">{props.playlist.name}</div>

          <div className="containerSubheader">
            {props.playlist.owner.display_name}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Playlist;
