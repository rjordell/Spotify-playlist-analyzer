import React from "react";
import SortBy from "./SortBy";

function InfoHeaderBox({
  selectedPlaylist,
  setCombinedData,
  combinedData,
  original,
  displaySort,
}) {
  return (
    <div className="main-container playlistInfo">
      <div className="container playlistInfo">
        <div className="imageAndTitle playlistInfo">
          <img
            src={selectedPlaylist.coverImg}
            className="coverImg playlistInfo"
            alt=""
          />
          <div className="now-playing__side">
            <div className="containerHeader">{selectedPlaylist.title}</div>
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
