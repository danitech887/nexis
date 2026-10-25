import os
from typing import Dict, Any, List, Optional
try:
    from tree_sitter_languages import get_language, get_parser
except ImportError:
    get_language, get_parser = None, None


SUPPORTED_LANGUAGES = {
    "py": "python",
    "python": "python",
    "ts": "typescript",
    "tsx": "tsx",
    "typescript": "typescript",
    "js": "javascript",
    "jsx": "javascript",
    "javascript": "javascript",
    "kt": "kotlin",
    "kotlin": "kotlin",
    "java": "java",
}


class ASTService:
    def __init__(self):
        self._parsers: Dict[str, Any] = {}
        self._languages: Dict[str, Any] = {}

    def _get_parser_for_lang(self, lang_name: str):
        if not get_parser:
            return None
        lang_key = SUPPORTED_LANGUAGES.get(lang_name.lower(), lang_name.lower())
        if lang_key not in self._parsers:
            try:
                self._parsers[lang_key] = get_parser(lang_key)
                self._languages[lang_key] = get_language(lang_key)
            except Exception:
                return None
        return self._parsers.get(lang_key)

    def parse_code(self, code: str, language: str) -> Dict[str, Any]:
        """
        Parses source code into an AST representation using tree-sitter.
        Computes syntax tree, token boundaries, and cyclomatic complexity.
        """
        parser = self._get_parser_for_lang(language)
        if not parser:
            # Fallback basic structural metric calculation
            return self._fallback_parse(code, language)

        tree = parser.parse(bytes(code, "utf8"))
        root_node = tree.root_node

        complexity = self.calculate_cyclomatic_complexity(root_node, language)
        functions = self.extract_functions(root_node, code)
        imports = self.extract_imports(root_node, code)

        return {
            "language": language,
            "has_syntax_errors": root_node.has_error,
            "root_type": root_node.type,
            "node_count": self._count_nodes(root_node),
            "cyclomatic_complexity": complexity,
            "function_count": len(functions),
            "functions": functions,
            "imports": imports,
            "ast_preview": self._node_to_dict(root_node, max_depth=3),
        }

    def _count_nodes(self, node) -> int:
        count = 1
        for child in node.children:
            count += self._count_nodes(child)
        return count

    def _node_to_dict(self, node, max_depth: int = 3, current_depth: int = 0) -> Dict[str, Any]:
        res = {
            "type": node.type,
            "start_point": {"row": node.start_point[0], "column": node.start_point[1]},
            "end_point": {"row": node.end_point[0], "column": node.end_point[1]},
        }
        if current_depth < max_depth and node.children:
            res["children"] = [
                self._node_to_dict(c, max_depth, current_depth + 1)
                for c in node.children[:10]  # cap children list for preview
            ]
        return res

    def calculate_cyclomatic_complexity(self, root_node, language: str) -> int:
        """
        Calculates cyclomatic complexity M = E - N + 2P or count of decision points + 1.
        Decision points include if, elif/else if, for, while, case, catch/except, logical operators.
        """
        decision_types = {
            "if_statement", "elif_clause", "for_statement", "while_statement",
            "except_clause", "catch_clause", "conditional_expression",
            "boolean_operator", "binary_expression", "case_statement",
            "try_statement"
        }
        complexity = 1

        def traverse(node):
            nonlocal complexity
            if node.type in decision_types:
                # Filter binary expressions to only logical AND/OR
                if node.type == "binary_expression":
                    text = node.text.decode("utf-8", errors="ignore") if hasattr(node, "text") else ""
                    if "&&" in text or "||" in text or "and" in text or "or" in text:
                        complexity += 1
                else:
                    complexity += 1
            for child in node.children:
                traverse(child)

        traverse(root_node)
        return complexity

    def extract_functions(self, root_node, code: str) -> List[Dict[str, Any]]:
        functions = []
        function_types = {
            "function_definition", "method_definition", "function_declaration",
            "arrow_function", "fun_declaration"
        }

        def traverse(node):
            if node.type in function_types:
                # Find identifier child
                name = "anonymous"
                for c in node.children:
                    if c.type in {"identifier", "property_identifier"}:
                        name = code[c.start_byte:c.end_byte]
                        break
                functions.append({
                    "name": name,
                    "type": node.type,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                    "complexity": self.calculate_cyclomatic_complexity(node, "generic"),
                    "code_snippet": code[node.start_byte:node.end_byte],
                })
            for child in node.children:
                traverse(child)

        traverse(root_node)
        return functions

    def extract_imports(self, root_node, code: str) -> List[str]:
        imports = []
        import_types = {"import_statement", "import_from_statement", "import_declaration"}

        def traverse(node):
            if node.type in import_types:
                imports.append(code[node.start_byte:node.end_byte].strip())
            for child in node.children:
                traverse(child)

        traverse(root_node)
        return imports

    def _fallback_parse(self, code: str, language: str) -> Dict[str, Any]:
        """Heuristic parser when tree-sitter bindings are not loaded"""
        lines = code.splitlines()
        branch_keywords = ["if ", "elif ", "else if ", "for ", "while ", "case ", "catch ", "except ", " && ", " || "]
        complexity = 1 + sum(any(kw in line for kw in branch_keywords) for line in lines)
        func_count = sum(1 for line in lines if line.strip().startswith(("def ", "function ", "fun ", "const ")) and ("(" in line or "=>" in line))
        return {
            "language": language,
            "has_syntax_errors": False,
            "root_type": "fallback_module",
            "node_count": len(lines),
            "cyclomatic_complexity": complexity,
            "function_count": func_count,
            "functions": [],
            "imports": [line.strip() for line in lines if line.strip().startswith(("import ", "from "))],
            "ast_preview": {"type": "fallback", "lines": len(lines)},
        }


ast_service = ASTService()
