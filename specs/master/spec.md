# Feature Specification: notifications

**Feature Branch**: `XXX-notifications`
**Created**: 2026-01-28
**Status**: Draft
**Input**: User description: "Add notifications page, preferences, and realtime delivery"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive notifications (Priority: P1)

As a user I want to receive notifications for messages, post likes, post comments, comment replies, gear-list invites, and follows so I can stay informed about interactions.

**Why this priority**: Core engagement feature.

**Independent Test**: Perform each action from another account and verify notification appears in UI and realtime.

**Acceptance Scenarios**:

1. **Given** I'm logged in, **When** another user likes my post, **Then** I receive a notification with the liker name and a link to the post.
2. **Given** I'm logged in, **When** another user comments on my post, **Then** I receive a notification with the commenter name and a link to the comment/post.
3. **Given** I'm logged in, **When** someone sends me a message, **Then** I receive a notification and the conversation shows as unread.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store notifications per-user and allow marking as read/clearing.
- **FR-002**: System MUST support per-user notification preferences to opt-out of categories.
- **FR-003**: System MUST emit realtime `notification:new` events to connected users.
- **FR-004**: Notifications MUST include descriptive text (actor displayName) and link to relevant entity.

## Success Criteria *(mandatory)*

- **SC-001**: Notifications delivered in realtime for online users.
- **SC-002**: Users can mark notifications read and clear them via API.
- **SC-003**: Preferences respected when creating notifications.
