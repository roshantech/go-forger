package upload_test

import (
	"archive/zip"
	"bytes"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"forge/internal/upload"
)

// makeZip creates an in-memory ZIP with the given files for testing.
func makeZip(files map[string]string) []byte {
	buf := new(bytes.Buffer)
	w := zip.NewWriter(buf)
	for name, content := range files {
		f, _ := w.Create(name)
		f.Write([]byte(content))
	}
	w.Close()
	return buf.Bytes()
}

func TestProcessZip_BasicGoProject(t *testing.T) {
	z := makeZip(map[string]string{
		"myapp/cmd/main.go":        "package main\nfunc main() {}",
		"myapp/internal/config.go": "package internal",
		"myapp/go.mod":             "module myapp",
		"myapp/README.md":          "# My App",
	})

	result, err := upload.ProcessZip(z)
	require.NoError(t, err)
	assert.Equal(t, 4, result.FileCount)
	assert.Equal(t, "go", result.Language)
	assert.Empty(t, result.SkippedDirs)
}

func TestProcessZip_SkipsNodeModules(t *testing.T) {
	z := makeZip(map[string]string{
		"app/index.ts":                     "export default {}",
		"app/node_modules/lodash/index.js": "module.exports = {}",
		"app/node_modules/react/index.js":  "module.exports = {}",
	})

	result, err := upload.ProcessZip(z)
	require.NoError(t, err)
	assert.Equal(t, 1, result.FileCount) // only index.ts
	assert.Contains(t, result.SkippedDirs, "node_modules")
}

func TestProcessZip_SkipsVendor(t *testing.T) {
	z := makeZip(map[string]string{
		"myapp/cmd/main.go":                  "package main",
		"myapp/vendor/github.com/gin/gin.go": "package gin",
	})

	result, err := upload.ProcessZip(z)
	require.NoError(t, err)
	assert.Equal(t, 1, result.FileCount)
	assert.Contains(t, result.SkippedDirs, "vendor")
}

func TestProcessZip_RejectsPathTraversal(t *testing.T) {
	buf := new(bytes.Buffer)
	w := zip.NewWriter(buf)
	f, _ := w.CreateHeader(&zip.FileHeader{Name: "../../etc/passwd"})
	f.Write([]byte("root:x:0:0"))
	w.Close()

	result, err := upload.ProcessZip(buf.Bytes())
	require.NoError(t, err)
	assert.Equal(t, 0, result.FileCount)
}

func TestProcessZip_RejectsOversizedZip(t *testing.T) {
	oversized := make([]byte, upload.MaxZipBytes+1)
	_, err := upload.ProcessZip(oversized)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "100MB limit")
}

func TestProcessZip_DetectsCommonPrefix(t *testing.T) {
	z := makeZip(map[string]string{
		"instagram-clone-main/cmd/main.go":      "package main",
		"instagram-clone-main/internal/auth.go": "package internal",
	})

	result, err := upload.ProcessZip(z)
	require.NoError(t, err)
	assert.Equal(t, 2, result.FileCount)

	// Common prefix stripped — paths should start with cmd/ or internal/
	foundCmd := false
	for _, fe := range result.Files {
		if fe.Path == "cmd/main.go" {
			foundCmd = true
		}
	}
	assert.True(t, foundCmd, "expected 'cmd/main.go' after prefix stripping")
}

func TestProcessZip_LanguageDetection(t *testing.T) {
	z := makeZip(map[string]string{
		"app/main.py":     "def main(): pass",
		"app/utils.py":    "def util(): pass",
		"app/config.yaml": "key: value",
	})

	result, err := upload.ProcessZip(z)
	require.NoError(t, err)
	assert.Equal(t, "python", result.Language)
}
