import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  
  // Auth routes
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/register", "routes/auth.register.tsx"),
  route("auth/logout", "routes/auth.logout.tsx"),
  route("auth/profile-setup", "routes/auth.profile-setup.tsx"),
  route("auth/forgot-password", "routes/auth.forgot-password.tsx"),
  route("auth/reset-password/:token", "routes/auth.reset-password.$token.tsx"),
  
  // User profile routes
  route("users/:username", "routes/users.$userId.tsx"),
  route("users/:username/edit", "routes/users.$userId.edit.tsx"),
  route("users/:userId/followers", "routes/users.$userId.followers.tsx"),
  route("users/:userId/following", "routes/users.$userId.following.tsx"),
  route("users/search", "routes/users.search.tsx"),
  
  // Discovery routes
  route("discover", "routes/discover.tsx"),
  route("crags", "routes/crags._index.tsx"),
  route("crags/favorites", "routes/crags.favorites.tsx"),
  route("crags/:cragId", "routes/crags.$cragId.tsx"),
  
  // Post routes
  route("posts", "routes/posts._index.tsx"),
  route("posts/new", "routes/posts.new.tsx"),
  route("posts/following", "routes/posts.following.tsx"),
  route("posts/user/:userId", "routes/posts.user.$userId.tsx"),
  route("posts/:postId", "routes/posts.$postId.tsx"),
  
  // Message routes
  route("messages", "routes/messages._index.tsx"),
  route("messages/new", "routes/messages.new.tsx"),
  route("messages/:conversationId", "routes/messages.$conversationId.tsx"),
  
  // API routes
  route("api/user/location", "routes/api.user.location.tsx"),
  route("api/users/:userId/follow", "routes/api.users.$userId.follow.tsx"),
  route("api/posts/:postId/like", "routes/api.posts.$postId.like.tsx"),
  route("api/posts/:postId/delete", "routes/api.posts.$postId.delete.tsx"),
  route("api/posts/:postId/likes", "routes/api.posts.$postId.likes.tsx"),
  route("api/posts/:postId/comments", "routes/api.posts.$postId.comments.tsx"),
  route("api/posts/:postId/comments/new", "routes/api.posts.$postId.comments.new.tsx"),
  route("api/comments/:commentId/delete", "routes/api.comments.$commentId.delete.tsx"),
  route("api/comments/:commentId/edit", "routes/api.comments.$commentId.edit.tsx"),
  route("api/comments/:commentId/replies", "routes/api.comments.$commentId.replies.tsx"),
  route("api/notifications/comment", "routes/api.notifications.comment.tsx"),
  route("api/crags/:cragId/favorite", "routes/api.crags.$cragId.favorite.tsx"),
  route("api/routes/:routeId/rating", "routes/api.routes.$routeId.rating.tsx"),
  route("api/ticks/:tickId/share", "routes/api.ticks.$tickId.share.tsx"),
  route("api/ticks/:tickId/delete", "routes/api.ticks.$tickId.delete.tsx"),
  
  // Tick routes
  route("ticks", "routes/ticks._index.tsx"),
  route("ticks/new", "routes/ticks.new.tsx"),
  route("ticks/stats", "routes/ticks.stats.tsx"),
  route("ticks/user/:userId", "routes/ticks.user.$userId.tsx"),
  route("ticks/:tickId", "routes/ticks.$tickId.tsx"),
  route("ticks/:tickId/edit", "routes/ticks.$tickId.edit.tsx"),
] satisfies RouteConfig;
