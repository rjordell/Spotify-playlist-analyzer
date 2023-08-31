import React from "react";

function Track({ track }) {
  //console.log("track");
  //console.log(track);
  if (track.track.artists[0] && track.track.tempo !== undefined) {
    return (
      <div className="container track">
        <div className="imageAndTitle">
          <img
            src={track.track.album.images[0].url}
            className="coverImg track"
            alt=""
          />

          <div className="now-playing__side">
            <div className="containerHeader">{track.track.name}</div>
            <div className="containerSubheader">
              {track.track.artists[0].name}
            </div>
          </div>
        </div>
        <div className="everythingElse">
          <div className="now-playing__side">
            <div className="containerHeader">{track.track.popularity}</div>
            <div className="containerSubheader">
              {track.track.artists[0].popularity}
            </div>
          </div>
          <div className="now-playing__side">
            <div className="containerHeader">
              {track.track.artists[0].followers.total}
            </div>
            <div className="containerSubheader">followers</div>
          </div>
          <div className="now-playing__side">
            <div className="containerHeader">{track.track.tempo}</div>
            <div className="containerSubheader">tempo</div>
          </div>
          <div className="now-playing__side">
            <div className="containerHeader">{track.track.energy}</div>
            <div className="containerSubheader">energy</div>
          </div>
          <div className="now-playing__side">
            <div className="containerHeader">{track.track.danceability}</div>
            <div className="containerSubheader">danceability</div>
          </div>
        </div>
      </div>
    );
  } else {
    return <div>Loading...</div>;
  }
}

export default Track;
