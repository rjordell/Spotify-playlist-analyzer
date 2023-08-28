import React from "react";
import SortBy from "./SortBy";

function InfoHeaderBox({ playlist, setCombinedData, combinedData }) {
  return (
    <div className="main-container playlistInfo">
      <div className="container track">
        <div className="imageAndTitle">
          <img
            src={playlist.images[0].url}
            className="coverImg playlistInfo"
            alt=""
          />
          <div className="now-playing__side">
            <div className="containerHeader">{playlist.name}</div>
            <div className="containerSubheader">
              {playlist.tracks.total} Songs
            </div>
          </div>
        </div>
        <SortBy setCombinedData={setCombinedData} combinedData={combinedData} />
      </div>
    </div>
  );
}

export default InfoHeaderBox;
