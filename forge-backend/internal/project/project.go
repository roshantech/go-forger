package project

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// ── Models ────────────────────────────────────────────────────

type Project struct {
	ID          string    `db:"id"          json:"id"`
	UserID      string    `db:"user_id"     json:"userId"`
	Name        string    `db:"name"        json:"name"`
	Description string    `db:"description" json:"description"`
	Language    string    `db:"language"    json:"language"`
	CreatedAt   time.Time `db:"created_at"  json:"createdAt"`
	UpdatedAt   time.Time `db:"updated_at"  json:"updatedAt"`
}

type ProjectFile struct {
	ID        string    `db:"id"         json:"id"`
	ProjectID string    `db:"project_id" json:"projectId"`
	Path      string    `db:"path"       json:"path"`
	Content   string    `db:"content"    json:"content"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt time.Time `db:"updated_at" json:"updatedAt"`
}

type ProjectWithFiles struct {
	Project
	Files []ProjectFile `json:"files"`
}

// ── Repository ────────────────────────────────────────────────

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, userID, name, description, language string) (*Project, error) {
	var p Project
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO projects (user_id, name, description, language)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, description, language, created_at, updated_at
	`, userID, name, description, language).StructScan(&p)
	return &p, err
}

func (r *Repository) ListByUser(ctx context.Context, userID string) ([]Project, error) {
	var projects []Project
	err := r.db.SelectContext(ctx, &projects, `
		SELECT id, user_id, name, description, language, created_at, updated_at
		FROM projects
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	return projects, nil
}

func (r *Repository) GetByID(ctx context.Context, id, userID string) (*ProjectWithFiles, error) {
	var p Project
	err := r.db.QueryRowxContext(ctx, `
		SELECT id, user_id, name, description, language, created_at, updated_at
		FROM projects WHERE id = $1 AND user_id = $2
	`, id, userID).StructScan(&p)
	if err != nil {
		return nil, err
	}

	var files []ProjectFile
	err = r.db.SelectContext(ctx, &files, `
		SELECT id, project_id, path, content, created_at, updated_at
		FROM project_files WHERE project_id = $1
		ORDER BY path
	`, id)
	if err != nil {
		return nil, err
	}
	if files == nil {
		files = []ProjectFile{}
	}
	return &ProjectWithFiles{Project: p, Files: files}, nil
}

func (r *Repository) Delete(ctx context.Context, id, userID string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM projects WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errNotFound
	}
	return nil
}

func (r *Repository) UpsertFile(ctx context.Context, projectID, path, content string) (*ProjectFile, error) {
	var f ProjectFile
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO project_files (project_id, path, content)
		VALUES ($1, $2, $3)
		ON CONFLICT (project_id, path) DO UPDATE
			SET content = EXCLUDED.content, updated_at = NOW()
		RETURNING id, project_id, path, content, created_at, updated_at
	`, projectID, path, content).StructScan(&f)
	return &f, err
}

func (r *Repository) GetFile(ctx context.Context, projectID, path string) (*ProjectFile, error) {
	var f ProjectFile
	err := r.db.QueryRowxContext(ctx, `
		SELECT id, project_id, path, content, created_at, updated_at
		FROM project_files WHERE project_id = $1 AND path = $2
	`, projectID, path).StructScan(&f)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// CreateUpload creates a project record from an uploaded or cloned source.
// source is one of: "upload", "github", "gitlab".
// originalURL is only set for GitHub/GitLab imports; pass "" for ZIP uploads.
func (r *Repository) CreateUpload(ctx context.Context, userID, name, source, originalURL string) (*Project, error) {
	var p Project
	err := r.db.QueryRowxContext(ctx, `
		INSERT INTO projects (user_id, name, description, language, source, original_url)
		VALUES ($1, $2, '', 'unknown', $3, NULLIF($4, ''))
		RETURNING id, user_id, name, description, language, created_at, updated_at
	`, userID, name, source, originalURL).StructScan(&p)
	return &p, err
}

// UpdateLanguage sets the detected language on a project after file processing.
func (r *Repository) UpdateLanguage(ctx context.Context, projectID, language string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE projects SET language = $1, updated_at = NOW() WHERE id = $2
	`, language, projectID)
	return err
}

// sentinel error
var errNotFound = fmt.Errorf("not found")

func IsNotFound(err error) bool { return err == errNotFound }
