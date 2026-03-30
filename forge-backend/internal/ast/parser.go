package ast

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"strings"
)

type ImportInfo struct {
	Path  string `json:"path"`
	Alias string `json:"alias,omitempty"`
}

type FunctionInfo struct {
	Name       string   `json:"name"`
	Receiver   string   `json:"receiver,omitempty"`
	Params     []string `json:"params"`
	Returns    []string `json:"returns"`
	IsExported bool     `json:"isExported"`
	LineStart  int      `json:"lineStart"`
	LineEnd    int      `json:"lineEnd"`
	Comment    string   `json:"comment,omitempty"`
}

type FieldInfo struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Tag     string `json:"tag,omitempty"`
	Comment string `json:"comment,omitempty"`
}

type TypeInfo struct {
	Name       string      `json:"name"`
	Kind       string      `json:"kind"`
	Fields     []FieldInfo `json:"fields,omitempty"`
	IsExported bool        `json:"isExported"`
	LineStart  int         `json:"lineStart"`
	LineEnd    int         `json:"lineEnd"`
}

type MethodInfo struct {
	Name    string   `json:"name"`
	Params  []string `json:"params"`
	Returns []string `json:"returns"`
}

type InterfaceInfo struct {
	Name       string       `json:"name"`
	Methods    []MethodInfo `json:"methods"`
	IsExported bool         `json:"isExported"`
	LineStart  int          `json:"lineStart"`
	LineEnd    int          `json:"lineEnd"`
}

type VarInfo struct {
	Name       string `json:"name"`
	Type       string `json:"type,omitempty"`
	Value      string `json:"value,omitempty"`
	IsExported bool   `json:"isExported"`
}

type FileInspection struct {
	FileName    string          `json:"fileName"`
	PackageName string          `json:"packageName"`
	Imports     []ImportInfo    `json:"imports"`
	Functions   []FunctionInfo  `json:"functions"`
	Types       []TypeInfo      `json:"types"`
	Interfaces  []InterfaceInfo `json:"interfaces"`
	Variables   []VarInfo       `json:"variables"`
	Constants   []VarInfo       `json:"constants"`
	ParseErrors []string        `json:"parseErrors,omitempty"`
}

// ParseGoFile parses Go source code from a string and returns a FileInspection.
// No temp files are written — parsing happens entirely in memory.
func ParseGoFile(fileName, content string) (*FileInspection, error) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, fileName, content, parser.ParseComments|parser.AllErrors)

	inspection := &FileInspection{
		FileName:  fileName,
		Imports:   []ImportInfo{},
		Functions: []FunctionInfo{},
		Types:     []TypeInfo{},
		Interfaces: []InterfaceInfo{},
		Variables: []VarInfo{},
		Constants: []VarInfo{},
	}

	if f == nil {
		return nil, fmt.Errorf("fatal parse error: %w", err)
	}

	// Collect parse errors but continue with partial result
	if err != nil {
		inspection.ParseErrors = []string{err.Error()}
	}

	inspection.PackageName = f.Name.Name

	// Imports
	for _, imp := range f.Imports {
		info := ImportInfo{
			Path: strings.Trim(imp.Path.Value, `"`),
		}
		if imp.Name != nil {
			info.Alias = imp.Name.Name
		}
		inspection.Imports = append(inspection.Imports, info)
	}

	// Top-level declarations
	for _, decl := range f.Decls {
		switch d := decl.(type) {
		case *ast.FuncDecl:
			inspection.Functions = append(inspection.Functions, parseFuncDecl(fset, d))
		case *ast.GenDecl:
			switch d.Tok {
			case token.TYPE:
				for _, spec := range d.Specs {
					ts, ok := spec.(*ast.TypeSpec)
					if !ok {
						continue
					}
					if iface, ok := ts.Type.(*ast.InterfaceType); ok {
						inspection.Interfaces = append(inspection.Interfaces, parseInterfaceSpec(fset, ts, iface))
					} else {
						inspection.Types = append(inspection.Types, parseTypeSpec(fset, d, ts))
					}
				}
			case token.VAR:
				inspection.Variables = append(inspection.Variables, parseValueSpecs(d)...)
			case token.CONST:
				inspection.Constants = append(inspection.Constants, parseValueSpecs(d)...)
			}
		}
	}

	return inspection, nil
}

func parseFuncDecl(fset *token.FileSet, fn *ast.FuncDecl) FunctionInfo {
	info := FunctionInfo{
		Name:       fn.Name.Name,
		IsExported: fn.Name.IsExported(),
		Params:     []string{},
		Returns:    []string{},
		LineStart:  fset.Position(fn.Pos()).Line,
		LineEnd:    fset.Position(fn.End()).Line,
	}

	if fn.Recv != nil && len(fn.Recv.List) > 0 {
		info.Receiver = typeString(fn.Recv.List[0].Type)
	}

	if fn.Type.Params != nil {
		for _, p := range fn.Type.Params.List {
			typeName := typeString(p.Type)
			if len(p.Names) == 0 {
				info.Params = append(info.Params, typeName)
			} else {
				for _, name := range p.Names {
					info.Params = append(info.Params, name.Name+" "+typeName)
				}
			}
		}
	}

	if fn.Type.Results != nil {
		for _, r := range fn.Type.Results.List {
			typeName := typeString(r.Type)
			if len(r.Names) == 0 {
				info.Returns = append(info.Returns, typeName)
			} else {
				for _, name := range r.Names {
					info.Returns = append(info.Returns, name.Name+" "+typeName)
				}
			}
		}
	}

	if fn.Doc != nil {
		info.Comment = strings.TrimSpace(fn.Doc.Text())
	}

	return info
}

func parseTypeSpec(fset *token.FileSet, genDecl *ast.GenDecl, ts *ast.TypeSpec) TypeInfo {
	info := TypeInfo{
		Name:       ts.Name.Name,
		IsExported: ts.Name.IsExported(),
		Fields:     []FieldInfo{},
		LineStart:  fset.Position(ts.Pos()).Line,
		LineEnd:    fset.Position(ts.End()).Line,
	}

	switch t := ts.Type.(type) {
	case *ast.StructType:
		info.Kind = "struct"
		if t.Fields != nil {
			for _, field := range t.Fields.List {
				fi := FieldInfo{
					Type: typeString(field.Type),
				}
				if field.Tag != nil {
					fi.Tag = strings.Trim(field.Tag.Value, "`")
				}
				if field.Comment != nil {
					fi.Comment = strings.TrimSpace(field.Comment.Text())
				}
				if len(field.Names) == 0 {
					// Embedded field
					fi.Name = fi.Type
					info.Fields = append(info.Fields, fi)
				} else {
					for _, name := range field.Names {
						f := fi
						f.Name = name.Name
						info.Fields = append(info.Fields, f)
					}
				}
			}
		}
	default:
		info.Kind = "alias"
	}

	return info
}

func parseInterfaceSpec(fset *token.FileSet, ts *ast.TypeSpec, iface *ast.InterfaceType) InterfaceInfo {
	info := InterfaceInfo{
		Name:       ts.Name.Name,
		IsExported: ts.Name.IsExported(),
		Methods:    []MethodInfo{},
		LineStart:  fset.Position(ts.Pos()).Line,
		LineEnd:    fset.Position(ts.End()).Line,
	}

	if iface.Methods != nil {
		for _, method := range iface.Methods.List {
			ft, ok := method.Type.(*ast.FuncType)
			if !ok {
				continue
			}
			if len(method.Names) == 0 {
				continue
			}
			mi := MethodInfo{
				Name:    method.Names[0].Name,
				Params:  []string{},
				Returns: []string{},
			}
			if ft.Params != nil {
				for _, p := range ft.Params.List {
					typeName := typeString(p.Type)
					if len(p.Names) == 0 {
						mi.Params = append(mi.Params, typeName)
					} else {
						for _, name := range p.Names {
							mi.Params = append(mi.Params, name.Name+" "+typeName)
						}
					}
				}
			}
			if ft.Results != nil {
				for _, r := range ft.Results.List {
					typeName := typeString(r.Type)
					if len(r.Names) == 0 {
						mi.Returns = append(mi.Returns, typeName)
					} else {
						for _, name := range r.Names {
							mi.Returns = append(mi.Returns, name.Name+" "+typeName)
						}
					}
				}
			}
			info.Methods = append(info.Methods, mi)
		}
	}

	return info
}

func parseValueSpecs(genDecl *ast.GenDecl) []VarInfo {
	var vars []VarInfo
	for _, spec := range genDecl.Specs {
		vs, ok := spec.(*ast.ValueSpec)
		if !ok {
			continue
		}
		for i, name := range vs.Names {
			vi := VarInfo{
				Name:       name.Name,
				IsExported: name.IsExported(),
			}
			if vs.Type != nil {
				vi.Type = typeString(vs.Type)
			}
			if i < len(vs.Values) {
				vi.Value = exprString(vs.Values[i])
			}
			vars = append(vars, vi)
		}
	}
	return vars
}

func typeString(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return "*" + typeString(t.X)
	case *ast.SelectorExpr:
		return typeString(t.X) + "." + t.Sel.Name
	case *ast.ArrayType:
		if t.Len == nil {
			return "[]" + typeString(t.Elt)
		}
		return "[" + exprString(t.Len) + "]" + typeString(t.Elt)
	case *ast.MapType:
		return "map[" + typeString(t.Key) + "]" + typeString(t.Value)
	case *ast.ChanType:
		switch t.Dir {
		case ast.SEND:
			return "chan<- " + typeString(t.Value)
		case ast.RECV:
			return "<-chan " + typeString(t.Value)
		default:
			return "chan " + typeString(t.Value)
		}
	case *ast.Ellipsis:
		return "..." + typeString(t.Elt)
	case *ast.IndexExpr:
		return typeString(t.X) + "[" + typeString(t.Index) + "]"
	case *ast.FuncType:
		return "func(...)"
	case *ast.InterfaceType:
		return "interface{}"
	case *ast.StructType:
		return "struct{}"
	default:
		return fmt.Sprintf("%T", expr)
	}
}

func exprString(expr ast.Expr) string {
	switch e := expr.(type) {
	case *ast.BasicLit:
		return e.Value
	case *ast.Ident:
		return e.Name
	case *ast.SelectorExpr:
		return exprString(e.X) + "." + e.Sel.Name
	case *ast.CallExpr:
		return typeString(e.Fun) + "(...)"
	case *ast.CompositeLit:
		return typeString(e.Type) + "{...}"
	default:
		return ""
	}
}
