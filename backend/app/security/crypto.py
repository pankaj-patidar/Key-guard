from functools import lru_cache
from cryptography.fernet import Fernet, InvalidToken
from ..config import get_settings


@lru_cache(maxsize=1)
def _get_fernet() -> Fernet:
    key = get_settings().CREDENTIAL_MASTER_KEY
    if not key:
        # Auto-generate for development — warn loudly
        import warnings
        warnings.warn(
            "CREDENTIAL_MASTER_KEY not set — generating ephemeral key. "
            "All credentials will be unreadable after restart. Set the env var in production.",
            RuntimeWarning, stacklevel=2,
        )
        generated = Fernet.generate_key()
        return Fernet(generated)
    return Fernet(key.encode())


def encrypt_secret(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(token: str) -> str:
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Credential data is corrupted or the master key has changed.") from exc
