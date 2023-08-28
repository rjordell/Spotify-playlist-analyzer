import React from "react";

function SortBy() {
  const handleSortChange = (e) => {
    const selectedOption = e.target.value;
    // Sort the combinedData based on the selected option
    // Update the state to trigger re-render with sorted data
  };
  return (
    <div className="sort-dropdown">
      <label htmlFor="sort">Sort By:</label>
      <select id="sort" onChange={handleSortChange}>
        <option value="popularity">Popularity</option>
        <option value="tempo">Tempo</option>
      </select>
    </div>
  );
}

export default SortBy;
