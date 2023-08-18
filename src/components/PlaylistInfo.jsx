import React from 'react';
import {useState, useEffect} from 'react';
import Track from './Track';

function PlaylistInfo() {
    const [inputValue, setInputValue] = useState('');
    const [playlist, setPlaylist] = useState(null);
    
    const getPlaylistinfo = async (id) => {
        try {
            const response = await fetch('/auth/getPlaylistInfo/' + id);
            const data = await response.json();
            if(data.error){
                setPlaylist(null);
            }else{
                setPlaylist(data);
            }
            console.log(data);
        } catch (error) {
            console.error('Error retrieving playlist info:', error);
            setPlaylist(null); // Clear playlist in case of error
        }
    }

    const getPlaylistinfo2 = async (id) => {
        try {
            const response = await fetch('/auth/getAllPlaylistTracks/' + id);
            const data = await response.json();
            if(data.error){
                setPlaylist(null);
            }else{
                setPlaylist(data);
            }
            console.log(data);
        } catch (error) {
            console.error('Error retrieving playlist info:', error);
            setPlaylist(null); // Clear playlist in case of error
        }
    }

    return (
        <div className="Playlist">
            <div className="PlaylistInfo">
                    <input
                        name = "mybutton"
                        placeholder="Enter Playlist ID"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="Input"
                    />

                <button className="btn-spotify" onClick={() => getPlaylistinfo2(inputValue)}>
                    Get info
                </button>

                {
                
                playlist !== null ? (
                    <>
                        <img src={playlist.images[0].url} className="now-playing__cover" alt="" />
                        {playlist.name}
                        <br />
                        Followers: {playlist.followers.total}
                    </>
                ) : (
                    <></>
                )
                
                }
            </div>
            <div className="SongBox">
                {playlist?.tracks?.items.map((item) => (
                    <Track key={item.track.id} id={item.track.id} />
                ))

            }
            </div>
        </div>
    );
}

export default PlaylistInfo;

