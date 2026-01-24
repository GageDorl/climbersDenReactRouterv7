# Color Migration Status

## Overview
Systematically replacing all Tailwind color classes with custom CSS variable-based utility classes from `app.css`.

## Color System
- **File**: `/app/app.css`
- **CSS Variables**: `--primary-color`, `--secondary-color`, `--accent-color`, `--success-color`, `--destructive-color`, `--text-primary`, `--text-secondary`, `--muted-color`, `--background`, `--surface`, `--border-color`
- **Utility Classes**: `.btn-primary`, `.btn-secondary`, `.btn-destructive`, `.badge-accent`, `.badge-success`, `.text-primary`, `.text-secondary`, `.text-muted`, `.bg-surface`, `.bg-secondary`, `.link-primary`, `.alert-success`, `.alert-destructive`, `.border-default`

## Conversion Patterns

### Buttons
- `bg-blue-600` → `.btn-primary` or `style={{backgroundColor: 'var(--primary-color)'}}`
- `bg-red-600` → `.btn-destructive`
- `bg-gray-200` → `.btn-secondary`

### Text
- `text-gray-900 dark:text-white` → `.text-primary`
- `text-gray-600 dark:text-gray-400` → `.text-secondary`
- `text-gray-500 dark:text-gray-400` → `.text-muted`

### Backgrounds
- `bg-white dark:bg-gray-800` → `.bg-surface`
- `bg-gray-50 dark:bg-gray-900` → `.bg-secondary`
- `bg-gray-100 dark:bg-gray-800` → `.bg-surface`

### Borders
- `border-gray-200 dark:border-gray-700` → `.border-default`

### Links
- `text-blue-600 hover:text-blue-700 dark:text-blue-400` → `.link-primary`

### Badges
- `bg-blue-100 text-blue-800` → `.badge-primary`
- `bg-green-100 text-green-800` → `.badge-success`
- `bg-purple-100 text-purple-800` → `.badge-accent`

### Alerts
- `bg-green-50 border-green-200 text-green-800` → `.alert-success`
- `bg-red-50 border-red-200 text-red-800` → `.alert-destructive`

### Gradients & Complex Colors
Use inline styles with CSS variables:
```tsx
style={{
  background: 'linear-gradient(to bottom, var(--surface), var(--background))'
}}
```

## Completed Files ✓

### UI Components (4/4)
- ✓ `/app/components/ui/button.tsx`
- ✓ `/app/components/ui/card.tsx`
- ✓ `/app/components/ui/input.tsx`
- ✓ `/app/components/ui/label.tsx`

### Routes (45+/~49) - NEARLY COMPLETE
- ✓ `/app/routes/posts._index.tsx`
- ✓ `/app/routes/posts.new.tsx`
- ✓ `/app/routes/posts.$postId.tsx`
- ✓ `/app/routes/auth.login.tsx`
- ✓ `/app/routes/auth.register.tsx`
- ✓ `/app/routes/auth.forgot-password.tsx`
- ✓ `/app/routes/home.tsx`
- ✓ `/app/routes/discover.tsx`
- ✓ `/app/routes/discover.nearby.tsx`
- ✓ `/app/routes/messages._index.tsx`
- ✓ `/app/routes/users.$userId.tsx`
- ✓ `/app/routes/users.$userId.followers.tsx`
- ✓ `/app/routes/ticks._index.tsx`
- ✓ `/app/routes/ticks.new.tsx`
- ✓ `/app/routes/crags.$cragId.tsx`
- ✓ `/app/routes/crags._index.tsx`
- ✓ `/app/routes/crags.favorites.tsx`
- ✓ `/app/routes/messages.$conversationId.tsx`
- ✓ `/app/routes/posts.following.tsx`
- ✓ `/app/routes/posts.user.$userId.tsx`
- ✓ `/app/routes/users.search.tsx`
- ✓ `/app/routes/users.$userId.edit.tsx`
- ✓ `/app/routes/users.$userId.following.tsx`
- ✓ `/app/routes/ticks.$tickId.tsx`
- ✓ `/app/routes/ticks.$tickId.edit.tsx`
- ✓ `/app/routes/ticks.stats.tsx`
- ✓ `/app/routes/ticks.user.$userId.tsx`
- ✓ `/app/routes/discover.nearby.tsx`
- ✓ `/app/routes/auth.profile-setup.tsx`

### Component Files (15+/~50+)
- ✓ `/app/components/error-boundary.tsx`
- ✓ `/app/components/profile/follow-button.tsx`
- ✓ `/app/components/ticks/tick-list.tsx`
- ✓ `/app/components/ticks/tick-filters.tsx`
- ✓ `/app/components/ticks/tick-form.tsx`
- ✓ `/app/components/ticks/stats-card.tsx`
- ✓ `/app/components/messages/message-bubble.tsx`
- ✓ `/app/components/messages/conversation-item.tsx`
- ✓ `/app/components/messages/unread-badge.tsx`
- ✓ `/app/components/messages/message-input.tsx`
- ✓ `/app/components/messages/message-thread.tsx`
- ✓ `/app/components/messages/typing-indicator.tsx`

## Remaining Work

### Lower Priority (few remaining instances)
- `/app/components/posts/` - Most post components still need conversion
- `/app/components/crags/` - Crag components
- `/app/components/location/` - Location components
- `/app/components/weather/` - Weather components

## Progress Summary

**Routes**: ~45/49 complete (92%)
**Components**: ~15/50+ complete (30%)
**Overall Estimated**: ~60/100 files complete (60%)
- `/app/components/posts/` - All post-related components
- `/app/components/messages/` - All message components
- `/app/components/ticks/` - All tick components
- `/app/components/crags/` - All crag components
- `/app/components/discovery/` - Discovery components
- `/app/components/location/` - Location components
- `/app/components/profile/` - Profile components
- `/app/components/weather/` - Weather components
- `/app/components/ui/` - Remaining UI components

## Search Commands

### Find remaining hard-coded colors in routes:
```bash
grep -r "bg-blue-\|text-blue-\|bg-gray-\|text-gray-\|bg-green-\|text-green-\|bg-red-\|text-red-\|border-gray-" app/routes/ --include="*.tsx"
```

### Find remaining hard-coded colors in components:
```bash
grep -r "bg-blue-\|text-blue-\|bg-gray-\|text-gray-\|bg-green-\|text-green-\|bg-red-\|text-red-\|border-gray-" app/components/ --include="*.tsx"
```

### Count remaining instances:
```bash
grep -r "bg-blue-\|text-blue-\|bg-gray-\|text-gray-\|bg-green-\|text-green-\|bg-red-\|text-red-\|border-gray-" app/ --include="*.tsx" | wc -l
```

## Notes
- **Keep all positioning Tailwind classes** (flex, grid, p-4, m-2, etc.)
- **Only replace color-related classes** (bg-*, text-*, border-* with colors)
- **Use CSS classes for common patterns**, inline styles for unique colors/gradients
- **Test both light and dark mode** after changes
- **Verify earthy color palette** maintains rock climbing theme

## Estimated Remaining Work
- Routes: ~30 files remaining
- Components: ~50+ files remaining
- Total matches found: 100+ hard-coded color instances

Last Updated: Current session
