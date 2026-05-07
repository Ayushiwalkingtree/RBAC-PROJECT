"""Unit tests for the Jinja2 template rendering engine."""
import pytest
from app.template_engine.renderer import (
    validate_template_syntax,
    render_template,
    validate_variables,
    build_render_context,
    get_example_context,
)


class TestValidateTemplateSyntax:
    def test_valid_simple_template(self):
        valid, err = validate_template_syntax("Hello {{ name }}!")
        assert valid is True
        assert err is None

    def test_valid_with_filter(self):
        valid, err = validate_template_syntax("Amount: {{ amount | currency }}")
        assert valid is True

    def test_valid_with_conditionals(self):
        valid, err = validate_template_syntax("{% if user %}Hello {{ user.name }}{% endif %}")
        assert valid is True

    def test_valid_with_loop(self):
        valid, err = validate_template_syntax("{% for item in items %}{{ item }}{% endfor %}")
        assert valid is True

    def test_invalid_unclosed_block(self):
        valid, err = validate_template_syntax("{% if user %}Hello")
        assert valid is False
        assert err is not None

    def test_invalid_bad_syntax(self):
        valid, err = validate_template_syntax("{{ unclosed")
        assert valid is False
        assert err is not None
        assert "Line" in err

    def test_empty_template_is_valid(self):
        valid, err = validate_template_syntax("")
        assert valid is True

    def test_plain_html_is_valid(self):
        valid, err = validate_template_syntax("<h1>Hello World</h1>")
        assert valid is True


class TestRenderTemplate:
    def test_simple_variable(self):
        ok, result, err = render_template("Hello {{ name }}!", {"name": "Alice"})
        assert ok is True
        assert result == "Hello Alice!"
        assert err is None

    def test_nested_variable(self):
        ok, result, err = render_template("Hi {{ user.first_name }}", {"user": {"first_name": "Bob"}})
        assert ok is True
        assert "Bob" in result

    def test_missing_variable_renders_empty(self):
        # Jinja2 sandbox renders undefined as empty string (autoescape mode)
        ok, result, err = render_template("Hello {{ name }}!", {})
        assert ok is True  # doesn't crash — renders as empty

    def test_currency_filter(self):
        ok, result, err = render_template("{{ amount | currency }}", {"amount": 1000})
        assert ok is True
        assert "1,000" in result or "₹" in result

    def test_mask_email_filter(self):
        ok, result, err = render_template("{{ email | mask_email }}", {"email": "alice@example.com"})
        assert ok is True
        assert "a***@example.com" == result

    def test_truncate_words_filter(self):
        text = " ".join(["word"] * 30)
        ok, result, err = render_template("{{ text | truncate_words(5) }}", {"text": text})
        assert ok is True
        assert "..." in result
        assert len(result.split()) <= 6  # 5 words + "..."

    def test_datetimeformat_filter(self):
        from datetime import date
        ok, result, err = render_template(
            "{{ dt | datetimeformat('%Y') }}", {"dt": date(2024, 1, 1)}
        )
        assert ok is True
        assert "2024" in result

    def test_conditional_block(self):
        tmpl = "{% if show %}Visible{% else %}Hidden{% endif %}"
        ok, result, _ = render_template(tmpl, {"show": True})
        assert result == "Visible"
        ok2, result2, _ = render_template(tmpl, {"show": False})
        assert result2 == "Hidden"

    def test_loop_block(self):
        tmpl = "{% for item in items %}{{ item }},{% endfor %}"
        ok, result, _ = render_template(tmpl, {"items": ["a", "b", "c"]})
        assert result == "a,b,c,"

    def test_org_context_injected(self):
        tmpl = "Support: {{ org.support_email }}"
        ctx = build_render_context({}, {"id": 1, "name": "ACME", "support_email": "help@acme.com"})
        ok, result, _ = render_template(tmpl, ctx)
        assert "help@acme.com" in result

    def test_current_year_injected(self):
        from datetime import datetime
        ctx = build_render_context({}, {"id": 1})
        ok, result, _ = render_template("{{ current_year }}", ctx)
        assert str(datetime.utcnow().year) in result

    def test_unsubscribe_url_injected(self):
        ctx = build_render_context({}, {"id": 5})
        ok, result, _ = render_template("{{ unsubscribe_url }}", ctx)
        assert "unsubscribe" in result.lower()

    def test_sandbox_blocks_dangerous_attr(self):
        # SandboxedEnvironment should block __class__ access
        ok, result, err = render_template("{{ ''.__class__ }}", {})
        # Either renders empty or raises — should NOT expose <class 'str'>
        if ok:
            assert "<class" not in result
        else:
            assert err is not None


class TestValidateVariables:
    def test_all_required_present(self):
        schema = [
            {"key": "user.first_name", "required": True, "default_value": None},
            {"key": "link", "required": True, "default_value": None},
        ]
        ok, missing = validate_variables(schema, {"user": {"first_name": "Alice"}, "link": "https://x.com"})
        assert ok is True
        assert missing == []

    def test_required_missing(self):
        schema = [{"key": "otp", "required": True, "default_value": None}]
        ok, missing = validate_variables(schema, {})
        assert ok is False
        assert "otp" in missing

    def test_optional_field_not_missing(self):
        schema = [{"key": "promo_code", "required": False, "default_value": None}]
        ok, missing = validate_variables(schema, {})
        assert ok is True
        assert missing == []

    def test_has_default_not_missing(self):
        schema = [{"key": "greeting", "required": True, "default_value": "Hello"}]
        ok, missing = validate_variables(schema, {})
        assert ok is True

    def test_dot_notation_lookup(self):
        schema = [{"key": "user.email", "required": True, "default_value": None}]
        ok, missing = validate_variables(schema, {"user": {"email": "a@b.com"}})
        assert ok is True

    def test_multiple_missing(self):
        schema = [
            {"key": "a", "required": True, "default_value": None},
            {"key": "b", "required": True, "default_value": None},
            {"key": "c", "required": False, "default_value": None},
        ]
        ok, missing = validate_variables(schema, {})
        assert ok is False
        assert set(missing) == {"a", "b"}

    def test_empty_schema_always_valid(self):
        ok, missing = validate_variables([], {"anything": "here"})
        assert ok is True
        assert missing == []


class TestBuildRenderContext:
    def test_org_globals_present(self):
        ctx = build_render_context({}, {"id": 1, "name": "ACME Corp"})
        assert ctx["org"]["name"] == "ACME Corp"
        assert "current_year" in ctx
        assert "unsubscribe_url" in ctx

    def test_user_variables_merged(self):
        ctx = build_render_context({"user": {"name": "Bob"}}, {"id": 1})
        assert ctx["user"]["name"] == "Bob"

    def test_user_variables_override_ok(self):
        ctx = build_render_context({"current_year": 2000}, {"id": 1})
        # User variable overrides global
        assert ctx["current_year"] == 2000


class TestGetExampleContext:
    def test_simple_key(self):
        schema = [{"key": "name", "example": "Alice", "default_value": None}]
        ctx = get_example_context(schema)
        assert ctx["name"] == "Alice"

    def test_dot_notation_builds_nested_dict(self):
        schema = [{"key": "user.first_name", "example": "Bob", "default_value": None}]
        ctx = get_example_context(schema)
        assert ctx["user"]["first_name"] == "Bob"

    def test_falls_back_to_default_value(self):
        schema = [{"key": "otp", "example": None, "default_value": "123456"}]
        ctx = get_example_context(schema)
        assert ctx["otp"] == "123456"

    def test_falls_back_to_placeholder(self):
        schema = [{"key": "link", "example": None, "default_value": None}]
        ctx = get_example_context(schema)
        assert ctx["link"] == "[link]"

    def test_multiple_keys(self):
        schema = [
            {"key": "a", "example": 1, "default_value": None},
            {"key": "b", "example": 2, "default_value": None},
        ]
        ctx = get_example_context(schema)
        assert ctx["a"] == 1
        assert ctx["b"] == 2
