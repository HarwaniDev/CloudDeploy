/**
 * Utility function to check if a GitHub access token is valid
 * Returns true if valid, false if invalid (401/403), and throws on other errors
 */
export async function checkGitHubAuth(accessToken: string): Promise<boolean> {
  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    })

    // If token is invalid (401/403), return false
    if (resp.status === 401 || resp.status === 403) {
      return false
    }

    // If successful, token is valid
    return resp.ok
  } catch (error) {
    // On network errors, assume token might still be valid (could be offline)
    // Only return false for clear authentication errors
    throw error
  }
}

