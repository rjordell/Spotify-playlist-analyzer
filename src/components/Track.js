import React from "react";

function Track(props) {
  return (
    <div className="trackContainer">
      <>
        <img
          src={props.track.album.images[0].url}
          className="track_cover"
          alt=""
        />
      </>
      <div className="now-playing__side">
        <div className="containerHeader">{props.track.name}</div>
        <div className="containerSubheader">{props.track.artists[0].name}</div>
      </div>

      <div className="now-playing__side">
        <div className="containerHeader">{props.track.popularity}</div>
        <div className="containerSubheader">{props.artist.popularity}</div>
      </div>
    </div>
  );
}

export default Track;
