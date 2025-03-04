"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { GitHubLogoIcon } from "@radix-ui/react-icons"
import { Download, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { parseGitHubUrl } from "@/lib/github-parser"
import { downloadRepository } from "@/lib/github-services"

export default function Home() {
  const [url, setUrl] = useState("")
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error"
    message: string
    progress?: number
  }>({ type: "idle", message: "" })

  const handleDownload = async () => {
    try {
      setStatus({ type: "loading", message: "Validating URL...", progress: 10 })

      const parsedUrl = parseGitHubUrl(url)
      if (!parsedUrl) {
        throw new Error("Invalid GitHub URL. Please enter a valid GitHub repository URL.")
      }

      setStatus({
        type: "loading",
        message: `Fetching contents from ${parsedUrl.owner}/${parsedUrl.repo}${parsedUrl.path ? ` at ${parsedUrl.path}` : ""}...`,
        progress: 30,
      })

      await downloadRepository(parsedUrl, (progress, message) => {
        setStatus({ type: "loading", message, progress })
      })

      setStatus({
        type: "success",
        message: "Download complete! If your download didn't start automatically, click the button again.",
        progress: 100,
      })
    } catch (error) {
      console.error("Download error:", error)
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && url.trim() && status.type !== "loading") {
      handleDownload()
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-primary/10 p-3 rounded-full w-fit">
            <GitHubLogoIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">DownGit</CardTitle>
          <CardDescription className="text-lg mt-2">
            Download specific folders or files from GitHub repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="github-url" className="text-sm font-medium">
              GitHub URL
            </label>
            <div className="flex gap-2">
              <Input
                id="github-url"
                placeholder="https://github.com/username/repository/tree/branch/folder"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleDownload} disabled={status.type === "loading" || !url.trim()} className="gap-2">
                {status.type === "loading" ? "Processing..." : "Download"}
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Enter a GitHub repository URL, folder URL, or file URL</p>
          </div>

          {status.type !== "idle" && (
            <div className="space-y-3">
              {status.type === "loading" && status.progress !== undefined && (
                <Progress value={status.progress} className="h-2" />
              )}

              <Alert
                variant={status.type === "error" ? "destructive" : status.type === "success" ? "default" : "default"}
              >
                {status.type === "error" && <AlertCircle className="h-4 w-4" />}
                {status.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col justify-center border-t p-4 gap-2">
          <p className="text-xs text-center text-muted-foreground">
            DownGit uses the GitHub API to fetch repository contents and create ZIP files.
            <br />
            Note: Private repositories require authentication.
          </p>
          <div className="text-xs text-center">
            <a
              href="https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              GitHub API Rate Limits <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}

