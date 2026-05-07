PUBLIC_EMAIL_DOMAINS = {
    "aol.com",
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "icloud.com",
    "live.com",
    "mail.com",
    "outlook.com",
    "proton.me",
    "protonmail.com",
    "yahoo.com",
    "yandex.com",
    "zoho.com",
}


def email_domain(email: str) -> str:
    return email.strip().lower().rsplit("@", 1)[-1]


def is_public_email_domain(domain: str) -> bool:
    return domain.lower() in PUBLIC_EMAIL_DOMAINS
