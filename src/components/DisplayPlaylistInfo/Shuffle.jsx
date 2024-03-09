import React, { useState } from "react";

function Shuffle({ playlistId, setCombinedData, original }) {
  const [shuffleState, setShuffleState] = useState("initial");
  const [isLoading, setIsLoading] = useState(false);

  const shufflePlaylist = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/auth/playlist/getShuffledPlaylist/${playlistId}`,
      );
      const data = await response.json();
      if (data.error) {
        console.error("Error retrieving shuffled playlist:", data.error);
      } else {
        console.log("SHUFFLE.JS: shuffled playlist ", data)
        setCombinedData(data);
        setShuffleState("shuffled");
      }
    } catch (error) {
      console.error("Error retrieving grouped data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const commitShuffle = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/auth/playlist/shufflePlaylist/", {
        method: "GET"
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Playlist shuffled successfully!");
        console.log(data)
        setShuffleState("satisfactory");
      } else {
        console.error("Failed to shuffle playlist.");
        // Handle failure if needed
      }
    } catch (error) {
      console.error("Error shuffling playlist:", error);
      // Handle error if needed
    } finally {
      setIsLoading(false);
    }
  };

  const cancelShuffle = () => {
    setCombinedData(original);
    setShuffleState("initial");
  };

  return (
    <>
      {shuffleState === "initial" && (
        <button onClick={shufflePlaylist}>Shuffle Playlist</button>
      )}
      {shuffleState === "shuffled" && (
        <>
          {isLoading ? (
            <p>Committing shuffle...</p>
          ) : (
            <>
              <p>Are you satisfied with the shuffle?</p>
              <button onClick={commitShuffle}>Yes! Commit the shuffle</button>
              <button onClick={shufflePlaylist}>No, shuffle again</button>
              <button onClick={cancelShuffle}>Cancel</button>
            </>
          )}
        </>
      )}
      {shuffleState === "satisfactory" && (
        <>
          <p>Playlist shuffled successfully!</p>
          <button onClick={shufflePlaylist}>
            Shuffle Again
          </button>
        </>
      )}
    </>
  );
}

export default Shuffle;
