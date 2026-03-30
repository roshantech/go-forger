package upload

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"path/filepath"
	"strings"
)

// SkipDirs lists directories that are never included regardless of project type.
var SkipDirs = map[string]bool{
	"node_modules": true, "vendor": true, ".git": true, ".svn": true,
	"__pycache__": true, ".next": true, ".nuxt": true, "dist": true,
	"build": true, "out": true, ".cache": true, "target": true,
	".gradle": true, "bin": true, "obj": true, "coverage": true,
	".nyc_output": true, "tmp": true, "temp": true,
}

// SkipExtensions lists file types that are binary or irrelevant.
var SkipExtensions = map[string]bool{
	".exe": true, ".dll": true, ".so": true, ".dylib": true,
	".o": true, ".a": true, ".lib": true, ".zip": true,
	".tar": true, ".gz": true, ".rar": true, ".jpg": true,
	".jpeg": true, ".png": true, ".gif": true, ".mp4": true,
	".mp3": true, ".pdf": true, ".bin": true, ".dat": true,
}

const (
	MaxZipBytes  = 100 * 1024 * 1024 // 100MB
	MaxFileBytes = 5 * 1024 * 1024   // 5MB per file
	MaxFilesHard = 10000
)

// FileEntry is a single processed file with its relative path and content.
type FileEntry struct {
	Path     string
	Content  string
	Language string
}

// ProcessResult holds the output of processing a ZIP or directory.
type ProcessResult struct {
	Files       []FileEntry
	FileCount   int
	SkippedDirs []string
	Language    string
	Warnings    []string
}

// ProcessZip takes raw ZIP bytes and returns a cleaned flat list of files.
func ProcessZip(data []byte) (*ProcessResult, error) {
	if len(data) > MaxZipBytes {
		return nil, fmt.Errorf("ZIP exceeds 100MB limit (%.1f MB uploaded)",
			float64(len(data))/(1024*1024))
	}

	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("invalid ZIP file: %w", err)
	}

	result := &ProcessResult{}
	langCount := map[string]int{}
	skipped := map[string]bool{}
	commonPrefix := detectCommonPrefix(r.File)

	for _, f := range r.File {
		if f.FileInfo().IsDir() {
			continue
		}

		// Strip common root prefix (e.g. "myrepo-main/" from GitHub ZIPs)
		cleanPath := strings.TrimPrefix(filepath.ToSlash(f.Name), commonPrefix)
		cleanPath = filepath.Clean(cleanPath)
		cleanPath = filepath.ToSlash(cleanPath)

		// Security: reject path traversal
		if strings.Contains(cleanPath, "..") || filepath.IsAbs(cleanPath) {
			continue
		}

		// Skip if any directory segment is in the skip list
		parts := strings.Split(cleanPath, "/")
		shouldSkip := false
		for i := 0; i < len(parts)-1; i++ {
			if SkipDirs[parts[i]] {
				shouldSkip = true
				skipped[parts[i]] = true
				break
			}
		}
		if shouldSkip {
			continue
		}

		// Skip by extension
		ext := strings.ToLower(filepath.Ext(cleanPath))
		if SkipExtensions[ext] {
			continue
		}

		// Hard file count limit
		if result.FileCount >= MaxFilesHard {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("project exceeds %d file limit — remaining files skipped", MaxFilesHard))
			break
		}

		// Skip files that are too large
		if f.UncompressedSize64 > MaxFileBytes {
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("%s skipped — exceeds 5MB single file limit", cleanPath))
			continue
		}

		// Read file content
		rc, err := f.Open()
		if err != nil {
			continue
		}
		content, err := io.ReadAll(io.LimitReader(rc, MaxFileBytes))
		rc.Close()
		if err != nil {
			continue
		}

		lang := detectLanguage(ext)
		if lang != "" {
			langCount[lang]++
		}

		result.Files = append(result.Files, FileEntry{
			Path:     cleanPath,
			Content:  string(content),
			Language: lang,
		})
		result.FileCount++
	}

	for dir := range skipped {
		result.SkippedDirs = append(result.SkippedDirs, dir)
	}

	result.Language = dominantLanguage(langCount)
	return result, nil
}

// detectCommonPrefix finds the shared root directory that GitHub ZIP files add.
func detectCommonPrefix(files []*zip.File) string {
	if len(files) == 0 {
		return ""
	}
	firstPath := filepath.ToSlash(files[0].Name)
	parts := strings.SplitN(firstPath, "/", 2)
	if len(parts) < 2 {
		return ""
	}
	prefix := parts[0] + "/"
	for _, f := range files {
		if !strings.HasPrefix(filepath.ToSlash(f.Name), prefix) {
			return ""
		}
	}
	return prefix
}

// DetectLanguage maps a file extension to a language name (exported for tests).
func DetectLanguage(ext string) string {
	return detectLanguage(ext)
}

func detectLanguage(ext string) string {
	m := map[string]string{
		".go": "go", ".ts": "typescript", ".tsx": "typescript",
		".js": "javascript", ".jsx": "javascript", ".py": "python",
		".rs": "rust", ".java": "java", ".rb": "ruby",
		".php": "php", ".cs": "csharp", ".cpp": "cpp", ".c": "c",
	}
	return m[ext]
}

func dominantLanguage(counts map[string]int) string {
	best, max := "unknown", 0
	for lang, count := range counts {
		if count > max {
			best, max = lang, count
		}
	}
	return best
}
