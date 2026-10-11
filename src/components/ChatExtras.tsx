import React, { useState, useRef } from 'react';
import {
  BarChart3,
  Plus,
  X,
  Check,
  Trash2,
  Loader2,
  Pin,
  Sticker as StickerIcon,
  Upload
} from 'lucide-react';

export interface ChatPollOption {
  id: string;
  text: string;
  votes?: Record<string, boolean>;
}

export interface ChatPollData {
  question: string;
  allowMultiple?: boolean;
  createdBy: string;
  options: ChatPollOption[];
}

export interface CustomStickerItem {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
  createdAt: number;
}

export const MAX_CUSTOM_STICKERS = 15;

export const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '💀', '👀', '💯'];

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: string[], allowMultiple: boolean) => Promise<void> | void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onCreatePoll
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && validOptions.length >= 2 && !submitting;

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onCreatePoll(question.trim(), validOptions, allowMultiple);
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(false);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[420px] bg-[#141418] border border-[#262632] rounded-3xl p-6 shadow-2xl relative text-white animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
              Create a Poll
            </h2>
            <p className="text-[11px] text-zinc-400">
              Ask the community and watch live votes come in
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
              Question
            </label>
            <input
              type="text"
              maxLength={140}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              className="w-full bg-[#1b1b22] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                Answers ({options.length}/6)
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs font-extrabold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add option</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={80}
                    value={opt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptions((prev) => prev.map((item, i) => (i === idx ? val : item)));
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-[#1b1b22] border border-[#2c2c38] rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove option"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 bg-[#1b1b22] border border-[#282834] rounded-xl px-3.5 py-2.5 cursor-pointer">
            <span className="text-xs font-bold text-zinc-200">Allow multiple answers</span>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-2xl font-black text-sm tracking-wide bg-gradient-to-r from-[#00add8] to-[#00d95f] hover:opacity-95 disabled:opacity-40 text-black shadow-lg transition-all cursor-pointer"
          >
            {submitting ? 'Posting Poll...' : 'Post Poll'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface ChatPollCardProps {
  poll: ChatPollData;
  myUserKey: string;
  onVote: (optionId: string) => void;
}

export const ChatPollCard: React.FC<ChatPollCardProps> = ({ poll, myUserKey, onVote }) => {
  const options = Array.isArray(poll.options) ? poll.options : [];
  const totalVotes = options.reduce(
    (sum, opt) => sum + Object.keys(opt.votes || {}).length,
    0
  );

  return (
    <div className="mt-2 max-w-md bg-[#181822] border border-[#2a2a38] rounded-2xl p-3.5 space-y-2.5 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 shrink-0">
            <BarChart3 className="w-4 h-4" />
          </span>
          <h4 className="text-sm sm:text-base font-black text-white leading-snug break-words">
            {poll.question}
          </h4>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 shrink-0">
          {poll.allowMultiple ? 'Multi-Vote' : 'Poll'}
        </span>
      </div>

      <div className="space-y-2">
        {options.map((opt) => {
          const votesMap = opt.votes || {};
          const count = Object.keys(votesMap).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const hasVoted = Boolean(myUserKey && votesMap[myUserKey]);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVote(opt.id)}
              className={`w-full relative overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                hasVoted
                  ? 'border-cyan-400/70 bg-[#1f2533]'
                  : 'border-[#2b2b38] bg-[#13131a] hover:border-[#3a3a4c]'
              }`}
            >
              <div
                style={{ width: `${pct}%` }}
                className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                  hasVoted ? 'bg-cyan-500/25' : 'bg-white/[0.06]'
                }`}
              />
              <div className="relative px-3 py-2 flex items-center justify-between gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                      hasVoted
                        ? 'bg-cyan-400 border-cyan-400 text-black'
                        : 'border-zinc-500 text-transparent'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                  </span>
                  <span className="font-bold text-white truncate">{opt.text}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="text-zinc-400 font-semibold">
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                  <span className="font-black text-cyan-300 w-9 text-right">{pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
        <span>
          Total: <strong className="text-zinc-200">{totalVotes}</strong>{' '}
          {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
        <span>Click an option to vote</span>
      </div>
    </div>
  );
};

interface StickerPickerPopoverProps {
  customStickers: CustomStickerItem[];
  isDevOrAbove: boolean;
  isUploadingSticker: boolean;
  onSelectSticker: (sticker: CustomStickerItem) => void;
  onUploadCustomSticker: (file: File, stickerName: string) => Promise<void> | void;
  onDeleteCustomSticker: (stickerId: string) => Promise<void> | void;
  onClose: () => void;
}

export const StickerPickerPopover: React.FC<StickerPickerPopoverProps> = ({
  customStickers,
  isDevOrAbove,
  isUploadingSticker,
  onSelectSticker,
  onUploadCustomSticker,
  onDeleteCustomSticker,
  onClose
}) => {
  const [newStickerName, setNewStickerName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaxReached = customStickers.length >= MAX_CUSTOM_STICKERS;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!isDevOrAbove || isMaxReached) return;
    const cleanName =
      newStickerName.trim() ||
      file.name.replace(/\.[^/.]+$/, '').slice(0, 20) ||
      'Chat Sticker';
    await onUploadCustomSticker(file, cleanName);
    setNewStickerName('');
  };

  return (
    <div className="w-80 sm:w-96 bg-[#17171f] border border-[#2b2b38] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#252532] bg-[#1b1b25] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickerIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs sm:text-sm font-black text-white tracking-wide">
            Chat Stickers
          </span>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isMaxReached
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {customStickers.length}/{MAX_CUSTOM_STICKERS} MAX
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Upload Bar (Developer and above only) */}
      {isDevOrAbove && (
        <div className="p-2.5 bg-[#14141b] border-b border-[#23232e]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              maxLength={22}
              disabled={isMaxReached || isUploadingSticker}
              value={newStickerName}
              onChange={(e) => setNewStickerName(e.target.value)}
              placeholder={
                isMaxReached
                  ? `Max ${MAX_CUSTOM_STICKERS} chat stickers reached`
                  : 'Sticker name (optional)...'
              }
              className="flex-1 bg-[#1d1d26] border border-[#2c2c38] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isMaxReached || isUploadingSticker}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#00add8] hover:opacity-95 disabled:opacity-40 text-white font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
            >
              {isUploadingSticker ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Sticker Grid */}
      <div className="p-3 max-h-72 overflow-y-auto">
        {customStickers.length === 0 ? (
          <div className="py-8 text-center bg-[#131319] rounded-xl border border-dashed border-[#272733] text-xs text-zinc-500 px-3">
            {isDevOrAbove
              ? 'No Chat Stickers uploaded yet. Upload one above!'
              : 'No Chat Stickers available yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {customStickers.map((st) => (
              <div
                key={st.id}
                className="group relative bg-[#1e1e28] hover:bg-[#262635] border border-[#2b2b3a] rounded-xl p-2 flex flex-col items-center justify-center transition-all"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectSticker(st);
                    onClose();
                  }}
                  className="w-full flex flex-col items-center cursor-pointer"
                  title={`Send ${st.name}`}
                >
                  <img
                    src={st.url}
                    alt={st.name}
                    className="w-16 h-16 object-contain rounded-lg group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[10px] font-bold text-zinc-300 truncate w-full text-center mt-1">
                    {st.name}
                  </span>
                </button>
                {isDevOrAbove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomSticker(st.id);
                    }}
                    title="Delete chat sticker"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/80 hover:bg-rose-600 text-white p-1 rounded-md transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface MessageReactionBarProps {
  reactions?: Record<string, Record<string, boolean>> | null;
  myUserKey: string;
  onToggleReaction: (emoji: string) => void;
}

export const MessageReactionBar: React.FC<MessageReactionBarProps> = ({
  reactions,
  myUserKey,
  onToggleReaction
}) => {
  if (!reactions || typeof reactions !== 'object') return null;
  const entries = Object.entries(reactions).filter(
    ([, usersMap]) => usersMap && Object.keys(usersMap).length > 0
  );
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
      {entries.map(([emoji, usersMap]) => {
        const count = Object.keys(usersMap).length;
        const reactedByMe = Boolean(myUserKey && usersMap[myUserKey]);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggleReaction(emoji)}
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 border transition-all active:scale-95 cursor-pointer ${
              reactedByMe
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                : 'bg-[#1a1a24] border-[#2b2b38] text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <span>{emoji}</span>
            <span className="text-[11px]">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
    stickerUrl?: string | null;
    stickerName?: string | null;
    mediaUrl?: string | null;
    poll?: ChatPollData | null;
  }[];
  canUnpin: boolean;
  onUnpin: (msgId: string) => void;
}

export const PinnedMessagesModal: React.FC<PinnedMessagesModalProps> = ({
  isOpen,
  onClose,
  pinnedMessages,
  canUnpin,
  onUnpin
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[460px] bg-[#141418] border border-[#262632] rounded-3xl p-5 shadow-2xl relative text-white animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#242430]">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-black text-white">
              Pinned Messages ({pinnedMessages.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {pinnedMessages.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-semibold">
              No pinned messages yet.
            </div>
          ) : (
            pinnedMessages.map((m) => (
              <div
                key={m.id}
                className="bg-[#1b1b23] border border-[#2a2a36] rounded-2xl p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-cyan-300">
                      {m.sender}
                    </span>
                    <span className="text-[10px] text-zinc-500">{m.timestamp}</span>
                  </div>
                  {m.text && (
                    <p className="text-xs sm:text-sm text-zinc-200 mt-1 break-words">
                      {m.text}
                    </p>
                  )}
                  {m.poll && (
                    <p className="text-xs text-amber-300 font-bold mt-1">
                      📊 Poll: {m.poll.question}
                    </p>
                  )}
                  {m.stickerUrl && (
                    <img
                      src={m.stickerUrl}
                      alt={m.stickerName || 'Sticker'}
                      className="w-14 h-14 object-contain mt-1.5"
                    />
                  )}
                </div>
                {canUnpin && (
                  <button
                    type="button"
                    onClick={() => onUnpin(m.id)}
                    title="Unpin message"
                    className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface TypingIndicatorBannerProps {
  typingUsernames: string[];
}

export const TypingIndicatorBanner: React.FC<TypingIndicatorBannerProps> = ({
  typingUsernames
}) => {
  if (typingUsernames.length === 0) return null;

  let label = '';
  if (typingUsernames.length === 1) {
    label = `${typingUsernames[0]} is typing...`;
  } else if (typingUsernames.length === 2) {
    label = `${typingUsernames[0]} and ${typingUsernames[1]} are typing...`;
  } else {
    label = `${typingUsernames[0]}, ${typingUsernames[1]} and ${typingUsernames.length - 2} others are typing...`;
  }

  return (
    <div className="mx-3 sm:mx-4 mb-1 px-3 py-1 rounded-xl bg-[#16161e]/90 border border-[#252533] flex items-center gap-2 text-xs text-zinc-300 animate-in fade-in duration-100">
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
      </span>
      <span className="font-bold text-cyan-300 truncate">{label}</span>
    </div>
  );
};
