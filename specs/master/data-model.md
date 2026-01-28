# Data Model: notifications

- Notification:
  - id: string
  - userId: string (recipient)
  - type: string (enum: message, post_liked, post_comment, comment_reply, gear_invite, new_follower)
  - content: JSON (message, actorName, actorId)
  - relatedEntityType: string
  - relatedEntityId: string
  - readStatus: boolean
  - createdAt: datetime

- NotificationPreference:
  - id: string
  - userId: string
  - messages: boolean
  - postLikes: boolean
  - postComments: boolean
  - commentReplies: boolean
  - gearListInvites: boolean
  - follows: boolean
