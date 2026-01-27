import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router';
import { useFetcher } from "react-router";

interface MessageInputProps {
  conversationId: string;
  onMediaSelect?: (files: File[]) => void;
  onSendMessage?: (textContent: string, mediaUrls: string[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export function MessageInput({ conversationId, onMediaSelect, onSendMessage, onTypingStart, onTypingStop }: MessageInputProps) {
  const [textContent, setTextContent] = useState("");
  // inputValue is what the textarea shows; textContent holds the actual value submitted
  const [inputValue, setInputValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isPostShare, setIsPostShare] = useState(false);
  const [postPreview, setPostPreview] = useState<any | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // If this is a post-share marker, keep marker in textContent and treat typed text as appended content
    if (isPostShare && textContent.startsWith('__POST_SHARE__:')) {
      setInputValue(newValue);
      const marker = textContent.split('\n')[0];
      const appended = newValue ? `\n${newValue}` : '';
      setTextContent(`${marker}${appended}`);
    } else {
      setTextContent(newValue);
      setInputValue(newValue);
    }
    
    // Auto-resize textarea
    const target = e.target;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 120) + "px";

    // Typing indicator logic
    if (newValue.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        onTypingStart?.();
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTypingStop?.();
      }, 2000);
    } else {
      // Empty text, stop typing immediately
      if (isTyping) {
        setIsTyping(false);
        onTypingStop?.();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // If a prefill was set in sessionStorage (from share flow), use it and clear it
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const s = sessionStorage.getItem('message_prefill');
        if (s && textContent.trim().length === 0) {
          let applied = false;
          try {
            const parsed = JSON.parse(s);
            if (parsed && parsed.type === 'post_share' && parsed.postId) {
              // encode as marker so server stores concise identifier
              const marker = `__POST_SHARE__:${parsed.postId}`;
              setTextContent(marker);
              setInputValue('');
              setIsPostShare(true);
              applied = true;
            }
          } catch (e) {
            // not JSON, fallback to raw string
          }

          if (!applied) {
            setTextContent(s);
            setInputValue(s);
          }

          // Remove prefill only after applying it so it survives navigation delays
          try {
            sessionStorage.removeItem('message_prefill');
          } catch (err) {}

          // adjust textarea height after setting value
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
              textareaRef.current.focus();
            }
          });
        }
      }
    } catch (e) {
      // ignore sessionStorage errors
    }
    // only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If conversationId changes (navigating into a conversation), retry applying any prefill
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const s = sessionStorage.getItem('message_prefill');
        if (s && textContent.trim().length === 0) {
          let applied = false;
          try {
            const parsed = JSON.parse(s);
            if (parsed && parsed.type === 'post_share' && parsed.postId) {
              const marker = `__POST_SHARE__:${parsed.postId}`;
              setTextContent(marker);
              setInputValue('');
              setIsPostShare(true);
              applied = true;
            }
          } catch (e) {
            // not JSON, fallback
          }

          if (!applied) {
            setTextContent(s);
            setInputValue(s);
          }

          try {
            sessionStorage.removeItem('message_prefill');
          } catch (err) {}

          // Ensure textarea is focused and sized
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
              textareaRef.current.focus();
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }
    // run when conversationId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // If textContent encodes a post share marker, fetch post preview for display
  useEffect(() => {
    const markerPrefix = '__POST_SHARE__:';
    if (textContent && textContent.startsWith(markerPrefix)) {
      // Extract the id after the prefix and sanitize (strip newlines/whitespace)
      const raw = textContent.slice(markerPrefix.length);
      const postId = raw.split(/\s|\r|\n/)[0]?.trim();
      if (!postId) return;
      setIsPostShare(true);
      setPostPreview(null);
      (async () => {
        try {
          const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/preview`, {
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) return;
          const data = await res.json();
          setPostPreview(data);
        } catch (e) {
          setPostPreview(null);
        }
      })();
    } else {
      setIsPostShare(false);
      setPostPreview(null);
    }
  }, [textContent]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB max

      return (isImage || isVideo) && isValidSize;
    });

    setSelectedFiles(validFiles);

    // Create preview URLs
    const urls = validFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    if (onMediaSelect) {
      onMediaSelect(validFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke old URL
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);

    if (onMediaSelect) {
      onMediaSelect(newFiles);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate
    if ((!textContent || textContent.trim().length === 0) && selectedFiles.length === 0) {
      return;
    }
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Submit form to server
    const formData = new FormData();
    formData.append("textContent", textContent.trim());
    // If this is a post-share, also include a separate postId field so server
    // accepts the share even if the marker wasn't applied client-side.
    if (isPostShare) {
      const markerPrefix = '__POST_SHARE__:';
      if (textContent && textContent.startsWith(markerPrefix)) {
        const raw = textContent.slice(markerPrefix.length);
        const postId = raw.split(/\s|\r|\n/)[0]?.trim();
        if (postId) formData.append('postId', postId);
      }
    }
    selectedFiles.forEach((file) => {
      formData.append("media", file);
    });

    // Notify parent of optimistic update (pass empty mediaUrls - will be populated from server)
    if (onSendMessage) {
      onSendMessage(textContent.trim(), []);
    }
    
    // Submit to server
    fetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
    
    // Clear form
    setTextContent("");
    setInputValue("");
    setSelectedFiles([]);
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (unless Shift is held for multiline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Media previews */}
      {previewUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previewUrls.map((url, index) => {
            const file = selectedFiles[index];
            const isVideo = file.type.startsWith("video/");

            return (
              <div key={index} className="relative">
                {isVideo ? (
                  <video
                    src={url}
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 rounded object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -right-2 -top-2 btn-destructive flex h-6 w-6 items-center justify-center rounded-full hover:opacity-80"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          name="media"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attach media button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-lg p-2 text-secondary hover:bg-surface hover:text-primary"
          aria-label="Attach media"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Text input */}
          <div className="flex-1">
            {isPostShare && postPreview && (
              <div className="mb-2 cursor-pointer rounded border border-default p-2 bg-surface" onClick={() => navigate(`/posts/${postPreview.id}`)}>
                <div className="flex items-center space-x-3">
                  {postPreview.mediaUrls && postPreview.mediaUrls[0] ? (
                          <img src={postPreview.mediaUrls[0]} alt="Preview" className="h-12 w-12 rounded object-cover" />
                        ) : (
                            <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center text-xs text-muted">
                              <div className="flex flex-col items-center">
                                <svg className="w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path><path d="M17 3v8"></path><path d="M7 7h6"></path></svg>
                                <span className="text-xs text-secondary">Text</span>
                              </div>
                            </div>
                        )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{postPreview.user?.displayName || 'Shared post'}</p>
                      <p className="text-sm text-muted truncate">{postPreview.textContent ? postPreview.textContent : (postPreview.caption || 'View post')}</p>
                  </div>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              name="textContent"
              value={inputValue}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={isPostShare ? "Add an optional message..." : "Type a message..."}
              rows={1}
              className="w-full resize-none rounded-lg border-default px-4 py-2 text-sm focus:outline-none bg-surface text-primary"
              required={selectedFiles.length === 0 && !isPostShare}
            />
          </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!textContent.trim() && selectedFiles.length === 0 && !isPostShare}
          className="btn-primary shrink-0 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
}
