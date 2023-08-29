import React from "react";

function Playlist(props) {
  const handleClick = () => {
    //console.log(props.playlist);
    props.cancelFetches();
    props.onClick(props.playlist);
  };
  return (
    <div className="container playlist" onClick={handleClick}>
      <div className="imageAndTitle">
        <img
          src={props.playlist.images[0].url}
          className="coverImg playlist"
          alt=""
        />

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
