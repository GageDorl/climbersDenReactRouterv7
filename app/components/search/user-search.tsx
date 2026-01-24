import { Form } from "react-router";

interface UserSearchProps {
  query?: string;
  results: Array<{
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  }>;
  onUserSelect: (user: {
    id: string;
    displayName: string;
    profilePhotoUrl: string | null;
  }) => void;
}

export function UserSearch({ query = "", results, onUserSelect }: UserSearchProps) {
  return (
    <div>
      {/* Search Input */}
      <div className="mb-4">
        <label
          htmlFor="search"
          className="mb-2 block text-sm font-medium text-primary"
        >
          Search for a user
        </label>
        <Form method="get">
          <input
            type="text"
            name="q"
            id="search"
            defaultValue={query}
            placeholder="Enter username..."
            className="w-full rounded-lg border border-default px-4 py-2 text-sm bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            autoComplete="off"
          />
        </Form>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => onUserSelect(user)}
              className="flex w-full items-center space-x-3 rounded-lg p-3 text-left hover:bg-secondary"
            >
              {user.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-surface">
                  {user.displayName[0].toUpperCase()}
                </div>
              )}
              <span className="font-medium text-primary">
                {user.displayName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty States */}
      {query && results.length === 0 && (
        <p className="text-center text-sm text-muted">
          No users found matching "{query}"
        </p>
      )}

      {!query && (
        <p className="text-center text-sm text-muted">
          Type at least 2 characters to search for users
        </p>
      )}
    </div>
  );
}
