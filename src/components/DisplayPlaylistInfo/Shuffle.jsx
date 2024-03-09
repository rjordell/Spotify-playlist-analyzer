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
          <h1>Shuffled playlist preview</h1>
          <br></br>
          <p>Do you like the shuffle?</p>
          <button onClick={commitShuffle}>
            {isLoading ? "Committing Shuffle..." : "Yes! Commit the shuffle"}
          </button>
          <button onClick={shufflePlaylist}>
            {isLoading ? "Shuffling..." : "No, shuffle again"}
          </button>
          <button onClick={cancelShuffle}>Exit</button>
        </>
      )}
      {shuffleState === "satisfactory" && (
        <>
          <p>Playlist shuffled successfully!</p>
          <button onClick={() => setShuffleState("initial")}>
            Shuffle Playlist
          </button>
        </>
      )}
    </>
  );
}

export default Shuffle;
