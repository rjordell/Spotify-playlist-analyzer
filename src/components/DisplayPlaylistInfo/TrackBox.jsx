import React from "react";
import { useState, useEffect } from "react";
import Track from "./Track";

function TrackBox({
  playlistId,
  setCombinedData,
  combinedData,
  setOriginalItems,
  setDisplaySort,
  playlistItemsController,
}) {
  const getCombinedData = async (offset, allItems = []) => {
    try {
      const response = await fetch(
        `/auth/playlist/getCombinedData/${playlistId}?limit=100&offset=${offset}`,
        {
          signal: playlistItemsController.signal,
        }
      );
      const data = await response.json();
      if (data.error) {
        console.log("got error");
        console.log(data.error);
        setCombinedData(null);
        setOriginalItems(null);
      } else {
        console.log("no error: playlist");
        console.log(data);

        const updatedItems = [...allItems, ...data.items];
        data.items = updatedItems;
        setCombinedData(data);
        setOriginalItems(data);
        //setPlaylistTracks({ items: updatedItems });

        //console.log("playlist with updated tracks");
        //console.log(playlistTracks);
        if (data.next) {
          getCombinedData(data.offset + 100, updatedItems);
        } else {
          setDisplaySort(true);
        }
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
      getCombinedData(0);
    }
  }, [playlistId]);

  useEffect(() => {
    if (combinedData) {
      console.log("combinedData");
      console.log(combinedData);
    }
  }, [combinedData]);

  return (
    <div className="main-container tracks">
      {combinedData?.items.map((item) => (
        <Track key={item.track} track={item} />
      ))}
    </div>
  );
}

export default TrackBox;
