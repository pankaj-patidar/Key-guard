from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, model_validator
from ..models.credential import CredentialType, CredentialScope
from .credential_templates import CREDENTIAL_TEMPLATES


class CredentialFieldResponse(BaseModel):
    field_key:     str
    field_label:   str
    is_sensitive:  bool
    is_multiline:  bool
    display_order: int
    value_set:     bool
    plain_value:   str | None = None   # only populated for non-sensitive fields on list

    model_config = {"from_attributes": True}


class CredentialCreate(BaseModel):
    label:           str
    description:     str | None = None
    credential_type: CredentialType
    scope:           CredentialScope = CredentialScope.PROJECT
    project_id:      UUID | None = None
    tags:            list[str] = []
    fields:          dict[str, str]

    @model_validator(mode="after")
    def validate_required_fields(self):
        template = CREDENTIAL_TEMPLATES.get(self.credential_type, [])
        required_keys = {f.key for f in template if f.required}
        missing = required_keys - set(self.fields.keys())
        if missing:
            raise ValueError(f"Missing required fields for {self.credential_type}: {missing}")
        if self.scope == CredentialScope.PROJECT and not self.project_id:
            raise ValueError("project_id is required for project-scoped credentials")
        return self


class CredentialUpdate(BaseModel):
    label:       str | None = None
    description: str | None = None
    tags:        list[str] | None = None
    fields:      dict[str, str] | None = None


class CredentialResponse(BaseModel):
    id:               UUID
    label:            str
    description:      str | None
    credential_type:  CredentialType
    scope:            CredentialScope
    project_id:       UUID | None
    tags:             list[str]
    fields:           list[CredentialFieldResponse]
    created_at:       datetime
    updated_at:       datetime
    last_accessed_at: datetime | None

    model_config = {"from_attributes": True}


class CredentialListResponse(BaseModel):
    items: list[CredentialResponse]
    total: int


class CredentialRevealResponse(BaseModel):
    credential_id: str
    fields:        dict[str, str]


class SnippetResponse(BaseModel):
    credential_id: str
    snippets:      dict[str, str]
