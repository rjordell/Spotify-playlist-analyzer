import React from 'react';
import {useState} from 'react';

function PlaylistInfo() {
    const [inputValue, setInputValue] = useState('');
    return (
        <div className="App">
            <header className="App-header">
                    <input
                        name = "mybutton"
                        placeholder="Enter Playlist ID"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />


                <a className="btn-spotify" href={"/auth/getPlaylistInfo/" + inputValue} >
                    Get playlist info
                </a>
            </header>
        </div>
    );
}
export default PlaylistInfo;

