package upload

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

// AllowedGitHosts restricts which domains can be cloned.
var AllowedGitHosts = []string{"github.com", "gitlab.com"}

// IsAllowedHost checks whether a URL points to an allowed git host.
func IsAllowedHost(url string) bool {
	for _, host := range AllowedGitHosts {
		if strings.Contains(url, host) {
			return true
		}
	}
	return false
}

// ImportFromURL shallow-clones a git repository and processes it.
func ImportFromURL(repoURL string) (*ProcessResult, error) {
	if !IsAllowedHost(repoURL) {
		return nil, fmt.Errorf("only github.com and gitlab.com URLs are supported")
	}

	repoURL = normaliseURL(repoURL)

	tmpDir, err := os.MkdirTemp("", "forge-import-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	_, err = git.PlainClone(tmpDir, false, &git.CloneOptions{
		URL:           repoURL,
		Depth:         1,
		SingleBranch:  true,
		ReferenceName: plumbing.HEAD,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to clone repository: %w", err)
	}

	return ProcessDirectory(tmpDir)
}

// ProcessDirectory walks a local directory and returns a flat list of files.
func ProcessDirectory(dir string) (*ProcessResult, error) {
	result := &ProcessResult{}
	langCount := map[string]int{}
	skipped := map[string]bool{}

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip unreadable paths, don't abort
		}

		relPath, err := filepath.Rel(dir, path)
		if err != nil || relPath == "." {
			return nil
		}
		relPath = filepath.ToSlash(relPath)

		// Skip hidden directories and known bloat dirs
		parts := strings.Split(relPath, "/")
		for _, part := range parts {
			if strings.HasPrefix(part, ".") || SkipDirs[part] {
				skipped[part] = true
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		if SkipExtensions[ext] {
			return nil
		}

		if info.Size() > MaxFileBytes {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("%s skipped — exceeds 5MB limit", relPath))
			return nil
		}

		if result.FileCount >= MaxFilesHard {
			return fmt.Errorf("file limit reached")
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return nil
		}

		lang := detectLanguage(ext)
		if lang != "" {
			langCount[lang]++
		}

		result.Files = append(result.Files, FileEntry{
			Path:     relPath,
			Content:  string(content),
			Language: lang,
		})
		result.FileCount++
		return nil
	})

	if err != nil && err.Error() != "file limit reached" {
		return nil, err
	}

	for dir := range skipped {
		result.SkippedDirs = append(result.SkippedDirs, dir)
	}

	result.Language = dominantLanguage(langCount)
	return result, nil
}

func normaliseURL(url string) string {
	if !strings.HasPrefix(url, "http") {
		url = "https://" + url
	}
	return url
}
