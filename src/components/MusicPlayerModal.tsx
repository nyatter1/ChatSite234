import React, { useState, useRef } from 'react';
import { X, UploadCloud, Play, Pause, Trash2, Music } from 'lucide-react';

export interface MusicTrack {
  name: string;
  url: string;
  size?: string;
}

interface MusicPlayerModalProps {
  currentTrack: MusicTrack | null;
  onSaveTrack: (track: MusicTrack | null) => void;
  onClose: () => void;
}

export default function MusicPlayerModal({
  currentTrack,
  onSaveTrack,
  onClose
}: MusicPlayerModalProps) {
  const [track, setTrack] = useState<MusicTrack | null>(currentTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    // Max 10MB check
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds 10MB limit. Please upload a smaller track.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + 'MB';

    const newTrack: MusicTrack = {
      name: file.name,
      url: objectUrl,
      size: sizeInMB
    };

    setTrack(newTrack);
    onSaveTrack(newTrack);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!audioRef.current || !track) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRemoveTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setTrack(null);
    setIsPlaying(false);
    onSaveTrack(null);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      {/* Hidden Audio Element */}
      {track && (
        <audio
          ref={audioRef}
          src={track.url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/mp3,audio/mpeg,audio/m4a,audio/wav,audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="w-full max-w-[390px] bg-[#141418] border border-[#24242e] rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header (Screenshot 4) */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Music className="w-5 h-5 text-white" />
            <h2 className="text-xl font-black text-white tracking-wide">
              Music Player
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message if file too large */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Center: Upload Track Button (Screenshot 4) */}
        <div className="my-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-[#00c2ff] hover:bg-[#00aee6] active:bg-[#0096cc] text-white font-black text-base sm:text-lg py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg shadow-cyan-500/25 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <UploadCloud className="w-6 h-6 stroke-[2.5]" />
            <span>Upload Track</span>
          </button>

          {/* Subtext: MP3 / M4A on left, Max 10MB (Screenshot 4) */}
          <div className="w-full flex items-center justify-between text-xs font-bold text-zinc-500 mt-3 px-2">
            <span>MP3 / M4A</span>
            <span>Max 10MB</span>
          </div>
        </div>

        {/* Current Uploaded Track & Player (If track exists) */}
        {track ? (
          <div className="mt-5 pt-4 border-t border-[#23232c] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Current Track
              </span>
              <button
                type="button"
                onClick={handleRemoveTrack}
                className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="bg-[#191922] border border-[#282836] rounded-2xl p-3 flex flex-col gap-2.5 shadow-inner">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-[#00c2ff] hover:bg-[#00aee6] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white translate-x-0.5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {track.name}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatTime(currentTime)} / {formatTime(duration || 0)}
                  </p>
                </div>
              </div>

              {/* Scrubber slider */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-[#2b2b38] rounded-lg appearance-none cursor-pointer accent-[#00c2ff]"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 text-center">
            <p className="text-xs text-zinc-500 italic">
              No profile music uploaded yet.
            </p>
          </div>
        )}

        {/* Done / Close Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#1e1e26] hover:bg-[#282834] text-white font-extrabold py-3 px-4 rounded-2xl text-sm transition-colors cursor-pointer border border-[#2b2b38]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
