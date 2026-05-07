from typing import Any, Dict, List, Optional, Tuple
from jinja2.sandbox import SandboxedEnvironment
from jinja2 import TemplateSyntaxError

def _currency(value, symbol="₹", decimals=2):
    try:
        return f"{symbol}{float(value):,.{decimals}f}"
    except:
        return str(value)

def _mask_email(email):
    try:
        p = email.split("@")
        return f"{p[0][0]}***@{p[1]}" if len(p)==2 else "***"
    except:
        return "***"

def _truncate_words(text, count=20):
    words = str(text).split()
    return text if len(words) <= count else " ".join(words[:count]) + "..."

def _datefmt(value, fmt="%d %b %Y", tz="UTC"):
    try:
        return value.strftime(fmt) if hasattr(value, "strftime") else str(value)
    except:
        return str(value)

_env = SandboxedEnvironment(autoescape=True)
_env.filters["currency"] = _currency
_env.filters["mask_email"] = _mask_email
_env.filters["truncate_words"] = _truncate_words
_env.filters["datetimeformat"] = _datefmt

def validate_template_syntax(tmpl: str) -> Tuple[bool, Optional[str]]:
    try:
        _env.parse(tmpl)
        return True, None
    except TemplateSyntaxError as e:
        return False, f"Line {e.lineno}: {e.message}"

def render_template(tmpl_str: str, context: Dict[str, Any]) -> Tuple[bool, str, Optional[str]]:
    try:
        rendered = _env.from_string(tmpl_str).render(**context)
        return True, rendered, None
    except Exception as e:
        return False, "", str(e)

def validate_variables(schema: List[Dict], provided: Dict) -> Tuple[bool, List[str]]:
    missing = []
    for var in schema:
        if var.get("required", False):
            key = var.get("key", "")
            if key not in provided:
                parts = key.split(".")
                obj = provided
                found = True
                for part in parts:
                    if isinstance(obj, dict) and part in obj:
                        obj = obj[part]
                    else:
                        found = False
                        break
                if not found and var.get("default_value") is None:
                    missing.append(key)
    return len(missing) == 0, missing

def build_render_context(variables: Dict, org_ctx: Dict) -> Dict:
    import hashlib
    from datetime import datetime
    ctx = {
        "org": {"name": org_ctx.get("name", "Platform"), "logo_url": org_ctx.get("logo_url", ""), "support_email": org_ctx.get("support_email", "support@example.com")},
        "current_year": datetime.utcnow().year,
        "unsubscribe_url": f"https://notifications.example.com/unsubscribe/{hashlib.sha256(str(org_ctx.get('id',1)).encode()).hexdigest()[:16]}",
    }
    ctx.update(variables)
    return ctx

def get_example_context(schema: List[Dict]) -> Dict:
    ctx = {}
    for var in schema:
        key = var.get("key", "")
        val = var.get("example") if var.get("example") is not None else (var.get("default_value") if var.get("default_value") is not None else f"[{key}]")
        parts = key.split(".")
        obj = ctx
        for part in parts[:-1]:
            obj.setdefault(part, {})
            obj = obj[part]
        obj[parts[-1]] = val
    return ctx
