package ast

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"reflect"
)

// TreeNode is a serialisable, recursive representation of a go/ast node.
type TreeNode struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Category string            `json:"category"`
	Name     string            `json:"name,omitempty"`
	Value    string            `json:"value,omitempty"`
	Line     int               `json:"line,omitempty"`
	Col      int               `json:"col,omitempty"`
	EndLine  int               `json:"endLine,omitempty"`
	EndCol   int               `json:"endCol,omitempty"`
	Props    map[string]string `json:"props,omitempty"`
	Children []*TreeNode       `json:"children,omitempty"`
}

// BuildTree parses Go source and returns the full AST as a TreeNode hierarchy.
func BuildTree(fileName, content string) (*TreeNode, error) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, fileName, content, parser.ParseComments|parser.AllErrors)
	if f == nil {
		return nil, fmt.Errorf("fatal parse error: %w", err)
	}

	var (
		counter int
		root    *TreeNode
		stack   []*TreeNode
	)

	ast.Inspect(f, func(n ast.Node) bool {
		if n == nil {
			if len(stack) > 0 {
				stack = stack[:len(stack)-1]
			}
			return false
		}

		counter++
		pos := fset.Position(n.Pos())
		end := fset.Position(n.End())

		tn := &TreeNode{
			ID:       fmt.Sprintf("n%d", counter),
			Type:     astTypeName(n),
			Category: astCategory(n),
			Line:     pos.Line,
			Col:      pos.Column,
			EndLine:  end.Line,
			EndCol:   end.Column,
			Props:    make(map[string]string),
		}

		extractNodeInfo(n, tn)

		if root == nil {
			root = tn
		} else if len(stack) > 0 {
			parent := stack[len(stack)-1]
			parent.Children = append(parent.Children, tn)
		}

		stack = append(stack, tn)
		return true
	})

	return root, nil
}

func astTypeName(n ast.Node) string {
	t := reflect.TypeOf(n)
	if t.Kind() == reflect.Ptr {
		return t.Elem().Name()
	}
	return t.Name()
}

func astCategory(n ast.Node) string {
	switch n.(type) {
	case *ast.File:
		return "file"
	case *ast.FuncDecl, *ast.FuncLit, *ast.FuncType:
		return "function"
	case *ast.IfStmt, *ast.ForStmt, *ast.RangeStmt,
		*ast.SwitchStmt, *ast.TypeSwitchStmt, *ast.SelectStmt,
		*ast.CaseClause, *ast.CommClause:
		return "control"
	case *ast.AssignStmt, *ast.DeclStmt, *ast.ExprStmt,
		*ast.ReturnStmt, *ast.BranchStmt, *ast.SendStmt,
		*ast.IncDecStmt, *ast.GoStmt, *ast.DeferStmt, *ast.BlockStmt:
		return "statement"
	case *ast.CallExpr, *ast.BinaryExpr, *ast.UnaryExpr,
		*ast.IndexExpr, *ast.SelectorExpr, *ast.SliceExpr,
		*ast.TypeAssertExpr, *ast.StarExpr, *ast.ParenExpr:
		return "expression"
	case *ast.Ident:
		return "identifier"
	case *ast.BasicLit, *ast.CompositeLit:
		return "literal"
	case *ast.GenDecl, *ast.TypeSpec, *ast.StructType,
		*ast.InterfaceType, *ast.MapType, *ast.ArrayType, *ast.ChanType:
		return "type"
	case *ast.ImportSpec:
		return "import"
	case *ast.Field, *ast.FieldList:
		return "field"
	default:
		return "other"
	}
}

func extractNodeInfo(n ast.Node, tn *TreeNode) {
	switch v := n.(type) {
	case *ast.File:
		tn.Name = v.Name.Name
		tn.Props["package"] = v.Name.Name
		tn.Props["decls"] = fmt.Sprintf("%d", len(v.Decls))

	case *ast.FuncDecl:
		tn.Name = v.Name.Name
		tn.Props["name"] = v.Name.Name
		tn.Props["exported"] = fmt.Sprintf("%v", v.Name.IsExported())
		if v.Recv != nil {
			tn.Props["method"] = "true"
		}

	case *ast.FuncLit:
		tn.Name = "func literal"

	case *ast.Ident:
		tn.Name = v.Name
		tn.Value = v.Name
		tn.Props["name"] = v.Name

	case *ast.BasicLit:
		tn.Value = v.Value
		tn.Name = v.Value
		tn.Props["kind"] = v.Kind.String()
		tn.Props["value"] = v.Value

	case *ast.AssignStmt:
		tn.Props["token"] = v.Tok.String()
		tn.Name = v.Tok.String()

	case *ast.BinaryExpr:
		tn.Props["op"] = v.Op.String()
		tn.Name = v.Op.String()

	case *ast.UnaryExpr:
		tn.Props["op"] = v.Op.String()
		tn.Name = v.Op.String()

	case *ast.IncDecStmt:
		tn.Props["token"] = v.Tok.String()
		tn.Name = v.Tok.String()

	case *ast.BranchStmt:
		tn.Props["token"] = v.Tok.String()
		tn.Name = v.Tok.String()
		if v.Label != nil {
			tn.Props["label"] = v.Label.Name
		}

	case *ast.GenDecl:
		tn.Props["token"] = v.Tok.String()
		tn.Name = v.Tok.String()
		tn.Props["specs"] = fmt.Sprintf("%d", len(v.Specs))

	case *ast.TypeSpec:
		tn.Name = v.Name.Name
		tn.Props["name"] = v.Name.Name
		tn.Props["exported"] = fmt.Sprintf("%v", v.Name.IsExported())

	case *ast.ImportSpec:
		if v.Path != nil {
			tn.Name = v.Path.Value
			tn.Props["path"] = v.Path.Value
		}
		if v.Name != nil {
			tn.Props["alias"] = v.Name.Name
		}

	case *ast.SelectorExpr:
		tn.Props["sel"] = v.Sel.Name
		tn.Name = "." + v.Sel.Name

	case *ast.Field:
		if len(v.Names) > 0 {
			names := ""
			for i, name := range v.Names {
				if i > 0 {
					names += ", "
				}
				names += name.Name
			}
			tn.Name = names
			tn.Props["names"] = names
		}

	case *ast.ReturnStmt:
		tn.Props["results"] = fmt.Sprintf("%d", len(v.Results))

	case *ast.CallExpr:
		tn.Props["args"] = fmt.Sprintf("%d", len(v.Args))

	case *ast.CompositeLit:
		tn.Props["elts"] = fmt.Sprintf("%d", len(v.Elts))

	case *ast.BlockStmt:
		tn.Props["stmts"] = fmt.Sprintf("%d", len(v.List))

	case *ast.IfStmt:
		tn.Name = "if"

	case *ast.ForStmt:
		tn.Name = "for"

	case *ast.RangeStmt:
		tn.Name = "for range"
		tn.Props["token"] = v.Tok.String()

	case *ast.SwitchStmt:
		tn.Name = "switch"

	case *ast.TypeSwitchStmt:
		tn.Name = "type switch"

	case *ast.SelectStmt:
		tn.Name = "select"

	case *ast.GoStmt:
		tn.Name = "go"

	case *ast.DeferStmt:
		tn.Name = "defer"

	case *ast.SendStmt:
		tn.Name = "<-"
	}
}
