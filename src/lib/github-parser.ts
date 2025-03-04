export interface ParsedGitHubUrl {
    owner: string
    repo: string
    branch: string
    path: string
    type: "file" | "directory"
  }
  
  /**
   * Parse a GitHub URL to extract owner, repo, branch, and path
   * Supports formats:
   * - https://github.com/username/repository
   * - https://github.com/username/repository/tree/branch/folder/subfolder
   * - https://github.com/username/repository/blob/branch/file.txt
   */
  export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
    try {
      // Clean the URL
      url = url.trim()
      if (url.endsWith("/")) {
        url = url.slice(0, -1)
      }
  
      // Basic validation
      if (!url.includes("github.com")) {
        return null
      }
  
      // Extract the parts after github.com
      const githubPrefix = "github.com/"
      const startIndex = url.indexOf(githubPrefix)
      if (startIndex === -1) {
        return null
      }
  
      const pathParts = url.slice(startIndex + githubPrefix.length).split("/")
  
      // Need at least owner and repo
      if (pathParts.length < 2) {
        return null
      }
  
      const owner = pathParts[0]
      const repo = pathParts[1]
  
      // Default to main branch if not specified
      let branch = "main"
      let path = ""
      let type: "file" | "directory" = "directory"
  
      // Check if URL specifies a branch, folder, or file
      if (pathParts.length > 3) {
        const specifier = pathParts[2]
  
        if (specifier === "tree" || specifier === "blob") {
          // Format: /username/repo/tree|blob/branch/[path]
          branch = pathParts[3]
          type = specifier === "tree" ? "directory" : "file"
  
          if (pathParts.length > 4) {
            // Join the remaining parts to form the path
            path = pathParts.slice(4).join("/")
          }
        }
      }
  
      return { owner, repo, branch, path, type }
    } catch (error) {
      console.error("Error parsing GitHub URL:", error)
      return null
    }
  }
  
  