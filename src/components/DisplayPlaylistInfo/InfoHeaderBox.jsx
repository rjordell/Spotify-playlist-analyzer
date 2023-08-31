import React from "react";
import SortBy from "./SortBy";

function InfoHeaderBox({
  playlist,
  setCombinedData,
  combinedData,
  original,
  displaySort,
}) {
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
              {combinedData ? combinedData.total : 0} Songs
            </div>
          </div>
        </div>
        {displaySort == true ? (
          <SortBy
            setCombinedData={setCombinedData}
            combinedData={combinedData}
            original={original}
          />
        ) : (
          <div>Loading tracks...</div>
        )}
      </div>
    </div>
  );
}

export default InfoHeaderBox;
