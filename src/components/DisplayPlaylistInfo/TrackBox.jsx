import React from "react";
import { useEffect } from "react";
import Track from "./Track";

function TrackBox({
  playlistId,
  setCombinedData,
  combinedData,
  setOriginalItems,
  setDisplaySort,
  playlistItemsController,
}) {
  const getCombinedData = async () => {
    try {
      const response = await fetch(
        `/auth/playlist/getCombinedData/${playlistId}`,
        {
          signal: playlistItemsController.signal,
        }
      );
      const data = await response.json();
      console.log("TRACKBOX.JS: data from getCombinedData ", data)
      if (data.error) {
        setCombinedData(null);
        setOriginalItems(null);
      } else {
        setCombinedData(data);
        setOriginalItems(data);
        setDisplaySort(true);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Error retrieving combined data:", error);
      } else {
        console.error("Error retrieving combined data:", error);
        setCombinedData(null);
        setOriginalItems(null);
      }
    }
  };

  useEffect(() => {
    if (playlistId) {
      setCombinedData(null);
      setOriginalItems(null);
      setDisplaySort(false);
      getCombinedData();
    }
  }, [playlistId]);

  return (
    <div className="main-container tracks">
      {combinedData?.tracks.items.map((item) => (
        //console.log(combinedData),
        <Track key={item.track} track={item.track} />
      ))}
    </div>
  );
}

export default TrackBox;
