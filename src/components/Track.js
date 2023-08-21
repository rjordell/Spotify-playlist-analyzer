import React from "react";

function Track(props) {
  return (
    <div className="trackContainer">
      <div className="imageAndTitle">
        <div className="imageCovers">
          <img
            src={props.track.album.images[0].url}
            className="track_cover"
            alt=""
          />
        </div>
        <div className="now-playing__side">
          <div className="containerHeader">{props.track.name}</div>
          <div className="containerSubheader">
            {props.track.artists[0].name}
          </div>
        </div>
      </div>
      <div className="everythingElse">
        <div className="now-playing__side">
          <div className="containerHeader">{props.track.popularity}</div>
          <div className="containerSubheader">{props.artist.popularity}</div>
        </div>
        <div className="now-playing__side">
          <div className="containerHeader">{props.artist.followers.total}</div>
          <div className="containerSubheader">followers</div>
        </div>
        <div className="now-playing__side">
          <div className="containerHeader">{props.audioFeatures.tempo}</div>
          <div className="containerSubheader">tempo</div>
        </div>
        <div className="now-playing__side">
          <div className="containerHeader">{props.audioFeatures.energy}</div>
          <div className="containerSubheader">energy</div>
        </div>
        <div className="now-playing__side">
          <div className="containerHeader">
            {props.audioFeatures.danceability}
          </div>
          <div className="containerSubheader">danceability</div>
        </div>
      </div>
    </div>
  );
}

export default Track;
