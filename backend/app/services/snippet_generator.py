from ..models.credential import CredentialType


class SnippetGenerator:
    @staticmethod
    def generate(cred_type: CredentialType, f: dict[str, str]) -> dict[str, str]:
        generators = {
            CredentialType.SSH_KEY:          SnippetGenerator._ssh,
            CredentialType.DATABASE:         SnippetGenerator._database,
            CredentialType.API_KEY:          SnippetGenerator._api_key,
            CredentialType.CLOUD_ACCOUNT:    SnippetGenerator._cloud,
            CredentialType.VPN:              SnippetGenerator._vpn,
            CredentialType.SERVER:           SnippetGenerator._server,
            CredentialType.DOCKER_REGISTRY:  SnippetGenerator._docker,
            CredentialType.SMTP:             SnippetGenerator._smtp,
            CredentialType.OAUTH_CLIENT:     SnippetGenerator._oauth,
            CredentialType.TLS_CERT:         SnippetGenerator._tls,
            CredentialType.GENERIC:          SnippetGenerator._generic,
        }
        fn = generators.get(cred_type, SnippetGenerator._generic)
        return {k: v for k, v in fn(f).items() if v}

    @staticmethod
    def _ssh(f: dict) -> dict:
        host = f.get("host", "<host>")
        port = f.get("port", "22")
        user = f.get("username", "<user>")
        return {
            "SSH Connect":
                f"ssh -i key.pem -p {port} {user}@{host}",
            "SCP Upload":
                f"scp -i key.pem -P {port} ./local_file {user}@{host}:/remote/path/",
            "SSH Tunnel (port 5432)":
                f"ssh -i key.pem -L 5432:localhost:5432 -N {user}@{host}",
            "SSH Config Block":
                f"Host {host}\n  HostName {host}\n  User {user}\n  Port {port}\n  IdentityFile ~/.ssh/key.pem",
        }

    @staticmethod
    def _database(f: dict) -> dict:
        h   = f.get("host", "<host>")
        p   = f.get("port", "5432")
        u   = f.get("username", "<user>")
        pw  = f.get("password", "<password>")
        db  = f.get("database", "<db>")
        ssl = f.get("ssl_mode", "require")
        cs  = f.get("connection_string", "")
        pg_url = cs if cs else f"postgresql://{u}:{pw}@{h}:{p}/{db}?sslmode={ssl}"
        return {
            "PostgreSQL URL":     pg_url,
            "MySQL URL":          f"mysql://{u}:{pw}@{h}:{p}/{db}",
            "psql CLI":           f"psql -h {h} -p {p} -U {u} -d {db}",
            "MySQL CLI":          f"mysql -h {h} -P {p} -u {u} -p{pw} {db}",
            "Python (psycopg2)":  f'psycopg2.connect("{pg_url}")',
            "SQLAlchemy engine":  f'create_engine("{pg_url}")',
        }

    @staticmethod
    def _api_key(f: dict) -> dict:
        key    = f.get("api_key", "<api_key>")
        ep     = f.get("endpoint", "https://api.example.com")
        prefix = f.get("header_prefix", "Bearer")
        header = f.get("header_name", "Authorization")
        val    = f"{prefix} {key}".strip() if prefix else key
        return {
            "curl":           f"curl -H '{header}: {val}' {ep}",
            "HTTP Header":    f"{header}: {val}",
            "Python requests":f'requests.get("{ep}", headers={{"{header}": "{val}"}})',
            "Axios (JS)":     f'axios.get("{ep}", {{ headers: {{ "{header}": "{val}" }} }})',
            "Raw Key":        key,
        }

    @staticmethod
    def _cloud(f: dict) -> dict:
        provider = f.get("provider", "aws").lower()
        ak     = f.get("access_key", "<access_key>")
        sk     = f.get("secret_key", "<secret_key>")
        region = f.get("region", "us-east-1")
        if provider == "aws":
            return {
                "AWS CLI env vars":
                    f"export AWS_ACCESS_KEY_ID={ak}\nexport AWS_SECRET_ACCESS_KEY={sk}\nexport AWS_DEFAULT_REGION={region}",
                "~/.aws/credentials":
                    f"[default]\naws_access_key_id = {ak}\naws_secret_access_key = {sk}\nregion = {region}",
                "Terraform provider":
                    f'provider "aws" {{\n  access_key = "{ak}"\n  secret_key = "{sk}"\n  region     = "{region}"\n}}',
            }
        return {"Access Key": ak, "Secret Key": sk, "Region": region}

    @staticmethod
    def _vpn(f: dict) -> dict:
        return {
            "OpenVPN CLI":    "sudo openvpn --config vpn.ovpn --auth-user-pass",
            "WireGuard CLI":  "sudo wg-quick up wg0.conf",
            "Note":           "Download the config file via Export tab, then run the command above.",
        }

    @staticmethod
    def _server(f: dict) -> dict:
        h = f.get("host", "<host>")
        p = f.get("port", "22")
        u = f.get("username", "root")
        return {
            "SSH Connect":        f"ssh {u}@{h} -p {p}",
            "sshpass (scripted)": f"sshpass -p '<password>' ssh {u}@{h} -p {p}",
            "Ansible inventory":  f"[servers]\n{h} ansible_user={u} ansible_port={p}",
        }

    @staticmethod
    def _docker(f: dict) -> dict:
        reg = f.get("registry_url", "registry.example.com")
        u   = f.get("username", "<user>")
        pw  = f.get("password", "<password>")
        return {
            "docker login":    f"echo '{pw}' | docker login {reg} -u {u} --password-stdin",
            "Pull image":      f"docker pull {reg}/<image>:<tag>",
            "Push image":      f"docker push {reg}/<image>:<tag>",
        }

    @staticmethod
    def _smtp(f: dict) -> dict:
        h  = f.get("host", "smtp.example.com")
        p  = f.get("port", "587")
        u  = f.get("username", "<user>")
        pw = f.get("password", "<password>")
        return {
            "Python smtplib":
                f'server = smtplib.SMTP("{h}", {p})\nserver.starttls()\nserver.login("{u}", "{pw}")',
            "Nodemailer (JS)":
                f'transport = nodemailer.createTransport({{ host:"{h}", port:{p}, auth:{{user:"{u}",pass:"{pw}"}} }})',
            "Django settings":
                f'EMAIL_HOST="{h}"\nEMAIL_PORT={p}\nEMAIL_HOST_USER="{u}"\nEMAIL_HOST_PASSWORD="{pw}"',
        }

    @staticmethod
    def _oauth(f: dict) -> dict:
        cid  = f.get("client_id", "<client_id>")
        cs   = f.get("client_secret", "<client_secret>")
        tok  = f.get("token_url", "https://provider.com/oauth/token")
        return {
            "Client credentials (curl)":
                f"curl -X POST {tok} \\\n  -d 'grant_type=client_credentials' \\\n  -d 'client_id={cid}' \\\n  -d 'client_secret={cs}'",
            ".env block":
                f"OAUTH_CLIENT_ID={cid}\nOAUTH_CLIENT_SECRET={cs}",
        }

    @staticmethod
    def _tls(f: dict) -> dict:
        domain = f.get("domain", "<domain>")
        return {
            "Nginx SSL config":
                f"ssl_certificate     /etc/ssl/certs/{domain}.pem;\nssl_certificate_key /etc/ssl/private/{domain}.key;",
            "Verify cert":
                f"openssl x509 -in cert.pem -text -noout | grep -E 'Subject|Issuer|Not After'",
            "Note": "Download cert + key files via the Export tab.",
        }

    @staticmethod
    def _generic(f: dict) -> dict:
        return {"Value": f.get("value", f.get("key", ""))}
