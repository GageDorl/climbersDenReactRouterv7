import { useEffect, useCallback } from 'react';
import { useSocket } from '~/hooks/use-socket';

interface CommentRealtimeEvent {
  type: 'comment:new' | 'comment:deleted' | 'comment:edited';
  postId: string;
  commentId: string;
  data?: any;
}

export function useCommentRealtime(
  postId: string,
  onCommentNew?: (comment: any) => void,
  onCommentDeleted?: (commentId: string) => void,
  onCommentEdited?: (comment: any) => void
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !postId) return;

    // Join post room for real-time updates
    socket?.emit('post:join', { postId });

    // Handle new comments
    const handleNewComment = (data: any) => {
      if (data.postId === postId && onCommentNew) {
        onCommentNew(data);
      }
    };

    // Handle deleted comments
    const handleDeletedComment = (data: any) => {
      if (data.postId === postId && onCommentDeleted) {
        onCommentDeleted(data.commentId);
      }
    };

    // Handle edited comments
    const handleEditedComment = (data: any) => {
      if (data.postId === postId && onCommentEdited) {
        onCommentEdited(data);
      }
    };

    socket?.on('comment:new', handleNewComment);
    socket?.on('comment:deleted', handleDeletedComment);
    socket?.on('comment:edited', handleEditedComment);

    return () => {
      socket?.off('comment:new', handleNewComment);
      socket?.off('comment:deleted', handleDeletedComment);
      socket?.off('comment:edited', handleEditedComment);
      socket?.emit('post:leave', { postId });
    };
  }, [socket, postId, onCommentNew, onCommentDeleted, onCommentEdited]);

  return socket;
}
