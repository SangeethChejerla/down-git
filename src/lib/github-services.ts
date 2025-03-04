import axios from "axios"
import JSZip from "jszip"
import FileSaver from "file-saver" 
import type { ParsedGitHubUrl } from "./github-parser"

interface GitHubContent {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: "file" | "dir" | "symlink" | "submodule"
  _links: {
    self: string
    git: string
    html: string
  }
}

/**
 * Download a repository, folder, or file from GitHub
 */
export async function downloadRepository(
  parsedUrl: ParsedGitHubUrl,
  onProgress: (progress: number, message: string) => void,
) {
  const { owner, repo, branch, path, type } = parsedUrl

  // Create a new ZIP file
  const zip = new JSZip()
  const zipFilename = getZipFilename(repo, path)

  try {
    // Fetch the contents
    if (type === "file") {
      await addFileToZip(zip, owner, repo, branch, path, "")
      onProgress(70, "Creating ZIP file...")
    } else {
      await fetchDirectoryContents(zip, owner, repo, branch, path, "", onProgress)
      onProgress(70, "Creating ZIP file...")
    }

    // Generate the ZIP file
    onProgress(80, "Generating ZIP file...")
    const content = await zip.generateAsync({ type: "blob" })

    // Trigger download
    onProgress(90, "Starting download...")
    FileSaver.saveAs(content, zipFilename) // Using FileSaver.saveAs instead of saveAs

    return true
  } catch (error) {
    console.error("Error downloading repository:", error)

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please try again later.")
      } else if (error.response?.status === 404) {
        throw new Error("Repository, folder, or file not found. Please check the URL and try again.")
      } else if (error.response?.status === 401) {
        throw new Error("Authentication required. Private repositories are not supported without authentication.")
      }
    }

    throw error
  }
}

/**
 * Recursively fetch directory contents and add them to the ZIP file
 */
async function fetchDirectoryContents(
  zip: JSZip,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  zipPath: string,
  onProgress: (progress: number, message: string) => void,
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`

  try {
    const response = await axios.get<GitHubContent[]>(apiUrl)
    const contents = response.data

    // Process each item in the directory
    for (let i = 0; i < contents.length; i++) {
      const item = contents[i]
      const itemPath = item.path
      const itemName = item.name
      const itemZipPath = zipPath ? `${zipPath}/${itemName}` : itemName

      // Update progress
      const progressPercent = 30 + Math.floor((i / contents.length) * 40)
      onProgress(progressPercent, `Processing ${itemPath}...`)

      if (item.type === "dir") {
        // Create directory in ZIP
        zip.folder(itemZipPath)
        // Recursively fetch contents
        await fetchDirectoryContents(zip, owner, repo, branch, itemPath, itemZipPath, onProgress)
      } else if (item.type === "file") {
        // Add file to ZIP
        await addFileToZip(zip, owner, repo, branch, itemPath, itemZipPath)
      }
    }
  } catch (error) {
    // Handle empty directories or other errors
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      // Create an empty folder if the directory doesn't exist or is empty
      zip.folder(zipPath || path)
    } else {
      throw error
    }
  }
}

/**
 * Add a file to the ZIP archive
 */
async function addFileToZip(
  zip: JSZip,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  zipPath: string,
): Promise<void> {
  try {
    // For files, we need to get the raw content
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`

    const response = await axios.get<GitHubContent>(apiUrl)
    const fileInfo = response.data

    // Check if the file is too large (GitHub API returns download_url as null for large files)
    if (!fileInfo.download_url) {
      // For large files, we need to use the Git Data API
      const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${fileInfo.sha}`
      const blobResponse = await axios.get(blobUrl)

      // The content is base64 encoded
      const content = blobResponse.data.content
      const encoding = blobResponse.data.encoding

      if (encoding === "base64") {
        zip.file(zipPath || fileInfo.name, content, { base64: true })
      } else {
        throw new Error(`Unsupported encoding: ${encoding}`)
      }
    } else {
      // For smaller files, we can download directly
      const fileResponse = await axios.get(fileInfo.download_url, { responseType: "arraybuffer" })
      zip.file(zipPath || fileInfo.name, fileResponse.data)
    }
  } catch (error) {
    console.error(`Error adding file ${path} to ZIP:`, error)
    // Add a placeholder for failed files
    zip.file(
      zipPath || path.split("/").pop() || "unknown-file",
      "Error: Could not download this file. It might be too large or inaccessible.",
    )
  }
}

/**
 * Generate a filename for the ZIP file
 */
function getZipFilename(repo: string, path: string): string {
  if (!path) {
    return `${repo}.zip`
  }

  // Extract the last part of the path for the filename
  const pathParts = path.split("/")
  const lastPart = pathParts[pathParts.length - 1]

  return `${repo}-${lastPart}.zip`
}

