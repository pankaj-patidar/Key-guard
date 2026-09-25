from dataclasses import dataclass, field
from ..models.credential import CredentialType


@dataclass
class FieldTemplate:
    key:          str
    label:        str
    is_sensitive: bool
    required:     bool = True
    default:      str = ""
    placeholder:  str = ""
    is_multiline: bool = False
    hint:         str = ""


TYPE_META: dict[str, dict] = {
    "ssh_key":         {"label": "SSH Key",          "icon": "terminal",      "color": "#06b6d4"},
    "database":        {"label": "Database",          "icon": "database",      "color": "#8b5cf6"},
    "api_key":         {"label": "API Key",           "icon": "zap",           "color": "#f59e0b"},
    "cloud_account":   {"label": "Cloud Account",     "icon": "cloud",         "color": "#38bdf8"},
    "vpn":             {"label": "VPN",               "icon": "shield",        "color": "#f43f5e"},
    "server":          {"label": "Server / VM",       "icon": "server",        "color": "#10b981"},
    "tls_cert":        {"label": "TLS Certificate",   "icon": "file-badge",    "color": "#f97316"},
    "oauth_client":    {"label": "OAuth Client",      "icon": "lock",          "color": "#ec4899"},
    "smtp":            {"label": "SMTP / Email",      "icon": "mail",          "color": "#3b82f6"},
    "docker_registry": {"label": "Docker Registry",  "icon": "box",           "color": "#14b8a6"},
    "generic":         {"label": "Generic Secret",   "icon": "key-round",     "color": "#94a3b8"},
}

CREDENTIAL_TEMPLATES: dict[CredentialType, list[FieldTemplate]] = {

    CredentialType.SSH_KEY: [
        FieldTemplate("host",        "Hostname / IP",       False, placeholder="192.168.1.10"),
        FieldTemplate("port",        "Port",                False, default="22"),
        FieldTemplate("username",    "Username",            False, placeholder="ubuntu"),
        FieldTemplate("private_key", "Private Key (PEM)",   True,  is_multiline=True,
                      hint="Paste the full -----BEGIN ... KEY----- block"),
        FieldTemplate("passphrase",  "Key Passphrase",      True,  required=False,
                      hint="Leave blank if the key has no passphrase"),
    ],

    CredentialType.DATABASE: [
        FieldTemplate("host",              "Host",              False, placeholder="db.internal"),
        FieldTemplate("port",              "Port",              False, default="5432"),
        FieldTemplate("database",          "Database Name",     False),
        FieldTemplate("username",          "Username",          False),
        FieldTemplate("password",          "Password",          True),
        FieldTemplate("ssl_mode",          "SSL Mode",          False, required=False,
                      default="require", placeholder="disable | require | verify-full"),
        FieldTemplate("connection_string", "Connection String", True,  required=False,
                      hint="Optional — overrides individual fields if set"),
    ],

    CredentialType.API_KEY: [
        FieldTemplate("api_key",       "API Key / Token",  True),
        FieldTemplate("endpoint",      "Base URL",         False, required=False,
                      placeholder="https://api.example.com"),
        FieldTemplate("header_name",   "Header Name",      False, required=False,
                      default="Authorization"),
        FieldTemplate("header_prefix", "Header Prefix",    False, required=False,
                      default="Bearer", hint="e.g. Bearer, Token — leave blank for raw key"),
    ],

    CredentialType.CLOUD_ACCOUNT: [
        FieldTemplate("provider",      "Cloud Provider",   False, placeholder="aws | gcp | azure"),
        FieldTemplate("account_id",    "Account / Project ID", False),
        FieldTemplate("region",        "Default Region",   False, required=False),
        FieldTemplate("access_key",    "Access Key ID",    True),
        FieldTemplate("secret_key",    "Secret Access Key",True),
        FieldTemplate("session_token", "Session Token",    True,  required=False,
                      hint="For temporary STS credentials only"),
        FieldTemplate("role_arn",      "Role ARN",         False, required=False),
    ],

    CredentialType.VPN: [
        FieldTemplate("host",        "VPN Server",         False),
        FieldTemplate("port",        "Port",               False, required=False, default="1194"),
        FieldTemplate("protocol",    "Protocol",           False, required=False,
                      default="udp", placeholder="udp | tcp"),
        FieldTemplate("username",    "Username",           False, required=False),
        FieldTemplate("password",    "Password",           True,  required=False),
        FieldTemplate("config_file", "OpenVPN / WG Config",True, is_multiline=True,
                      required=False, hint="Paste full .ovpn or .conf content"),
        FieldTemplate("ca_cert",     "CA Certificate",     True,  is_multiline=True, required=False),
        FieldTemplate("client_cert", "Client Certificate", True,  is_multiline=True, required=False),
        FieldTemplate("client_key",  "Client Private Key", True,  is_multiline=True, required=False),
    ],

    CredentialType.SERVER: [
        FieldTemplate("host",          "IP / Hostname",     False),
        FieldTemplate("port",          "SSH Port",          False, default="22"),
        FieldTemplate("username",      "Username",          False, default="root"),
        FieldTemplate("password",      "Password",          True,  required=False),
        FieldTemplate("sudo_password", "Sudo Password",     True,  required=False,
                      hint="If different from login password"),
    ],

    CredentialType.TLS_CERT: [
        FieldTemplate("domain",      "Domain / CN",        False),
        FieldTemplate("issuer",      "Certificate Issuer", False, required=False),
        FieldTemplate("expires_at",  "Expiry Date",        False, required=False,
                      placeholder="YYYY-MM-DD"),
        FieldTemplate("certificate", "Certificate (PEM)",  True,  is_multiline=True),
        FieldTemplate("private_key", "Private Key (PEM)",  True,  is_multiline=True),
        FieldTemplate("chain",       "CA Chain (PEM)",     True,  is_multiline=True, required=False),
    ],

    CredentialType.OAUTH_CLIENT: [
        FieldTemplate("provider",      "OAuth Provider",   False, placeholder="google | github | okta"),
        FieldTemplate("client_id",     "Client ID",        False),
        FieldTemplate("client_secret", "Client Secret",    True),
        FieldTemplate("scopes",        "Scopes",           False, required=False,
                      placeholder="openid profile email"),
        FieldTemplate("redirect_uri",  "Redirect URI",     False, required=False),
        FieldTemplate("token_url",     "Token Endpoint",   False, required=False),
        FieldTemplate("auth_url",      "Auth Endpoint",    False, required=False),
    ],

    CredentialType.SMTP: [
        FieldTemplate("host",       "SMTP Host",           False, placeholder="smtp.gmail.com"),
        FieldTemplate("port",       "Port",                False, default="587"),
        FieldTemplate("encryption", "Encryption",          False, default="STARTTLS",
                      placeholder="None | STARTTLS | SSL/TLS"),
        FieldTemplate("username",   "Username / Email",    False),
        FieldTemplate("password",   "Password / App Pass", True),
        FieldTemplate("from_name",  "Sender Display Name", False, required=False),
    ],

    CredentialType.DOCKER_REGISTRY: [
        FieldTemplate("registry_url", "Registry URL",      False,
                      placeholder="registry.example.com | docker.io"),
        FieldTemplate("username",     "Username",          False),
        FieldTemplate("password",     "Password / Token",  True),
        FieldTemplate("email",        "Email",             False, required=False),
    ],

    CredentialType.GENERIC: [
        FieldTemplate("key",   "Key / Name",       False),
        FieldTemplate("value", "Value / Secret",   True),
        FieldTemplate("extra", "Additional Notes", False, required=False, is_multiline=True),
    ],
}
