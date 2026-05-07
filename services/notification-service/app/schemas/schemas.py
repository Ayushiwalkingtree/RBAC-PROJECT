# from datetime import datetime
# from typing import Any, Dict, List, Optional
# from pydantic import BaseModel, Field

# class OrmBase(BaseModel):
#     model_config = {"from_attributes": True}

# class VariableSchemaItem(BaseModel):
#     key: str
#     label: str
#     data_type: str = Field(default="string")
#     required: bool = False
#     default_value: Optional[Any] = None
#     description: Optional[str] = None
#     example: Optional[Any] = None

# class EmailConfigCreate(BaseModel):
#     config_name: str = Field(..., min_length=1, max_length=150)
#     provider: str = Field(default="SMTP")
#     host: Optional[str] = None
#     port: Optional[int] = Field(None, ge=1, le=65535)
#     use_tls: bool = True
#     use_starttls: bool = False
#     username: Optional[str] = None
#     password: Optional[str] = None
#     oauth2_client_id: Optional[str] = None
#     oauth2_client_secret: Optional[str] = None
#     oauth2_refresh_token: Optional[str] = None
#     oauth2_token_url: Optional[str] = None
#     api_key: Optional[str] = None
#     from_name: str = Field(..., min_length=1, max_length=150)
#     from_email: str = Field(..., min_length=5, max_length=255)
#     reply_to: Optional[str] = None
#     max_send_rate: Optional[int] = None
#     is_default: bool = False
#     connection_timeout_s: int = 30
#     extra_headers_json: Dict[str, str] = {}

# class EmailConfigUpdate(BaseModel):
#     config_name: Optional[str] = None
#     host: Optional[str] = None
#     port: Optional[int] = None
#     use_tls: Optional[bool] = None
#     use_starttls: Optional[bool] = None
#     username: Optional[str] = None
#     password: Optional[str] = None
#     api_key: Optional[str] = None
#     from_name: Optional[str] = None
#     from_email: Optional[str] = None
#     reply_to: Optional[str] = None
#     max_send_rate: Optional[int] = None
#     is_default: Optional[bool] = None

# class EmailConfigResponse(BaseModel):
#     nt_email_config_id: int
#     config_name: str
#     host: Optional[str] = None
#     port: Optional[int] = None
#     use_tls: bool
#     from_name: str
#     from_email: str
#     is_default: bool
#     is_active: bool
#     has_password: bool = False
#     has_api_key: bool = False
#     created_at: datetime
#     model_config = {"from_attributes": True}

#     @classmethod
#     def from_orm_masked(cls, obj):
#         return cls(
#             nt_email_config_id=obj.id,
#             config_name=obj.config_name,
#             host=obj.host,
#             port=obj.port,
#             use_tls=obj.use_tls,
#             from_name=obj.from_name,
#             from_email=obj.from_email,
#             is_default=obj.is_default,
#             is_active=obj.is_active,
#             has_password=bool(obj.password_enc),
#             has_api_key=bool(obj.api_key_enc),
#             created_at=obj.created_at,
#         )

# class ConnectionTestRequest(BaseModel):
#     test_recipient: str = Field(..., min_length=5)

# class EmailTemplateCreate(BaseModel):
#     template_key: str = Field(..., min_length=1, max_length=100)
#     template_name: str = Field(..., min_length=1, max_length=200)
#     description: Optional[str] = None
#     entity_type: Optional[str] = None
#     subject: str = Field(..., min_length=1, max_length=500)
#     html_body: str = Field(..., min_length=1)
#     text_body: Optional[str] = None
#     storage_type: str = "DB"
#     storage_path: Optional[str] = None
#     variables_schema_json: List[VariableSchemaItem] = []
#     locale: str = "en"
#     nt_email_config_id: Optional[int] = None

# class EmailTemplateUpdate(BaseModel):
#     version: int
#     template_name: Optional[str] = None
#     subject: Optional[str] = None
#     html_body: Optional[str] = None
#     text_body: Optional[str] = None
#     variables_schema_json: Optional[List[VariableSchemaItem]] = None
#     nt_email_config_id: Optional[int] = None
#     change_note: Optional[str] = None

# class EmailTemplateResponse(BaseModel):
#     nt_email_template_id: int
#     template_key: str
#     template_name: str
#     description: Optional[str] = None
#     entity_type: Optional[str] = None
#     subject: str
#     html_body: Optional[str] = None
#     text_body: Optional[str] = None
#     storage_type: str
#     variables_schema_json: List[Dict[str, Any]] = []
#     locale: str
#     version: int
#     is_platform_default: bool
#     at_organization_id: int
#     created_at: datetime
#     model_config = {"from_attributes": True}

#     @classmethod
#     def from_model(cls, obj):
#         return cls(
#             nt_email_template_id=obj.id,
#             template_key=obj.template_key,
#             template_name=obj.template_name,
#             description=obj.description,
#             entity_type=obj.entity_type,
#             subject=obj.subject,
#             html_body=obj.html_body,
#             text_body=obj.text_body,
#             storage_type=obj.storage_type,
#             variables_schema_json=obj.variables_schema_json or [],
#             locale=obj.locale,
#             version=obj.version,
#             is_platform_default=obj.is_platform_default,
#             at_organization_id=obj.at_organization_id,
#             created_at=obj.created_at,
#         )

# class TemplatePreviewRequest(BaseModel):
#     variables: Dict[str, Any] = {}
#     locale: Optional[str] = None

# class RestoreVersionRequest(BaseModel):
#     change_note: Optional[str] = None

# class EntityLinkCreate(BaseModel):
#     entity_type: str = Field(..., min_length=1, max_length=150)
#     event_name: str = Field(..., min_length=1, max_length=150)
#     template_id: int
#     recipient_field: str = Field(..., min_length=1, max_length=150)
#     cc_fields_json: List[str] = []
#     variable_mapping_json: Dict[str, str] = {}
#     is_async: bool = True

# class EntityLinkUpdate(BaseModel):
#     template_id: Optional[int] = None
#     recipient_field: Optional[str] = None
#     cc_fields_json: Optional[List[str]] = None
#     variable_mapping_json: Optional[Dict[str, str]] = None
#     is_async: Optional[bool] = None

# class EntityLinkResponse(BaseModel):
#     nt_entity_template_link_id: int
#     entity_type: str
#     event_name: str
#     nt_email_template_id: int
#     recipient_field: str
#     cc_fields_json: List[str] = []
#     variable_mapping_json: Dict[str, Any] = {}
#     is_async: bool
#     is_active: bool
#     created_at: datetime
#     model_config = {"from_attributes": True}

#     @classmethod
#     def from_model(cls, obj):
#         return cls(
#             nt_entity_template_link_id=obj.id,
#             entity_type=obj.entity_type,
#             event_name=obj.event_name,
#             nt_email_template_id=obj.nt_email_template_id,
#             recipient_field=obj.recipient_field,
#             cc_fields_json=obj.cc_fields_json or [],
#             variable_mapping_json=obj.variable_mapping_json or {},
#             is_async=obj.is_async,
#             is_active=obj.is_active,
#             created_at=obj.created_at,
#         )

# class Recipient(BaseModel):
#     email: str = Field(..., min_length=5)
#     name: Optional[str] = None

# class AttachmentItem(BaseModel):
#     filename: str = Field(..., min_length=1)
#     content_type: str = Field(..., min_length=5)
#     content_base64: Optional[str] = None
#     presigned_url: Optional[str] = None
#     size_bytes: int = Field(..., ge=1)

# class SendEmailRequest(BaseModel):
#     to: List[Recipient] = Field(..., min_length=1)
#     cc: List[Recipient] = []
#     bcc: List[Recipient] = []
#     template_id: int
#     variables: Dict[str, Any] = {}
#     has_attachment: bool = False
#     attachments: List[AttachmentItem] = []
#     override_from_email: Optional[str] = None
#     override_from_name: Optional[str] = None
#     reply_to: Optional[str] = None
#     email_config_id: Optional[int] = None
#     priority: int = Field(5, ge=1, le=10)
#     is_async: bool = True
#     correlation_id: Optional[str] = None
#     entity_type: Optional[str] = None
#     entity_id: Optional[int] = None
#     org_id: Optional[int] = None

# class SendRawRequest(BaseModel):
#     to: List[Recipient] = Field(..., min_length=1)
#     subject: str = Field(..., min_length=1, max_length=500)
#     html_body: str = Field(..., min_length=1)
#     text_body: Optional[str] = None
#     has_attachment: bool = False
#     attachments: List[AttachmentItem] = []
#     email_config_id: Optional[int] = None
#     org_id: Optional[int] = None

# class SendLogResponse(BaseModel):
#     send_log_id: int
#     status: str
#     subject: str
#     to_email_masked: str
#     has_attachment: bool
#     attachment_count: int
#     attachment_names_json: List[str] = []
#     retry_count: int
#     failure_reason: Optional[str] = None
#     provider_message_id: Optional[str] = None
#     cc_count: int = 0
#     queued_at: Optional[datetime] = None
#     sent_at: Optional[datetime] = None
#     delivered_at: Optional[datetime] = None
#     opened_at: Optional[datetime] = None
#     created_at: datetime
#     entity_type: Optional[str] = None
#     entity_id: Optional[int] = None
#     model_config = {"from_attributes": True}

#     @classmethod
#     def from_model(cls, obj):
#         return cls(
#             send_log_id=obj.id,
#             status=obj.status,
#             subject=obj.subject,
#             to_email_masked=obj.to_email_masked,
#             has_attachment=obj.has_attachment,
#             attachment_count=obj.attachment_count,
#             attachment_names_json=obj.attachment_names_json or [],
#             retry_count=obj.retry_count,
#             failure_reason=obj.failure_reason,
#             provider_message_id=obj.provider_message_id,
#             cc_count=obj.cc_count or 0,
#             queued_at=obj.queued_at,
#             sent_at=obj.sent_at,
#             delivered_at=obj.delivered_at,
#             opened_at=obj.opened_at,
#             created_at=obj.created_at,
#             entity_type=obj.entity_type,
#             entity_id=obj.entity_id,
#         )

# class RequeueRequest(BaseModel):
#     priority: int = Field(3, ge=1, le=10)



from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class OrmBase(BaseModel):
    model_config = {"from_attributes": True}

class VariableSchemaItem(BaseModel):
    key: str
    label: str
    data_type: str = Field(default="string")
    required: bool = False
    default_value: Optional[Any] = None
    description: Optional[str] = None
    example: Optional[Any] = None

class EmailConfigCreate(BaseModel):
    config_name: str = Field(..., min_length=1, max_length=150)
    provider: str = Field(default="SMTP")
    host: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    use_tls: bool = True
    use_starttls: bool = False
    username: Optional[str] = None
    password: Optional[str] = None
    oauth2_client_id: Optional[str] = None
    oauth2_client_secret: Optional[str] = None
    oauth2_refresh_token: Optional[str] = None
    oauth2_token_url: Optional[str] = None
    api_key: Optional[str] = None
    from_name: str = Field(..., min_length=1, max_length=150)
    from_email: str = Field(..., min_length=5, max_length=255)
    reply_to: Optional[str] = None
    max_send_rate: Optional[int] = None
    is_default: bool = False
    connection_timeout_s: int = 30
    extra_headers_json: Dict[str, str] = {}

class EmailConfigUpdate(BaseModel):
    config_name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    use_tls: Optional[bool] = None
    use_starttls: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None
    api_key: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    max_send_rate: Optional[int] = None
    is_default: Optional[bool] = None

class EmailConfigResponse(BaseModel):
    nt_email_config_id: int
    config_name: str
    host: Optional[str] = None
    port: Optional[int] = None
    use_tls: bool
    from_name: str
    from_email: str
    is_default: bool
    is_active: bool
    has_password: bool = False
    has_api_key: bool = False
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_masked(cls, obj):
        return cls(
            nt_email_config_id=obj.id,
            config_name=obj.config_name,
            host=obj.host,
            port=obj.port,
            use_tls=obj.use_tls,
            from_name=obj.from_name,
            from_email=obj.from_email,
            is_default=obj.is_default,
            is_active=obj.is_active,
            has_password=bool(obj.password_enc),
            has_api_key=bool(obj.api_key_enc),
            created_at=obj.created_at,
        )

class ConnectionTestRequest(BaseModel):
    test_recipient: str = Field(..., min_length=5)

class EmailTemplateCreate(BaseModel):
    template_key: str = Field(..., min_length=1, max_length=100)
    template_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    entity_type: Optional[str] = None
    subject: str = Field(..., min_length=1, max_length=500)
    html_body: str = Field(..., min_length=1)
    text_body: Optional[str] = None
    storage_type: str = "DB"
    storage_path: Optional[str] = None
    variables_schema_json: List[VariableSchemaItem] = []
    locale: str = "en"
    nt_email_config_id: Optional[int] = None

class EmailTemplateUpdate(BaseModel):
    version: int
    template_name: Optional[str] = None
    subject: Optional[str] = None
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    variables_schema_json: Optional[List[VariableSchemaItem]] = None
    nt_email_config_id: Optional[int] = None
    change_note: Optional[str] = None

class EmailTemplateResponse(BaseModel):
    nt_email_template_id: int
    template_key: str
    template_name: str
    description: Optional[str] = None
    entity_type: Optional[str] = None
    subject: str
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    storage_type: str
    variables_schema_json: List[Dict[str, Any]] = []
    locale: str
    version: int
    is_platform_default: bool
    at_organization_id: int
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, obj):
        return cls(
            nt_email_template_id=obj.id,
            template_key=obj.template_key,
            template_name=obj.template_name,
            description=obj.description,
            entity_type=obj.entity_type,
            subject=obj.subject,
            html_body=obj.html_body,
            text_body=obj.text_body,
            storage_type=obj.storage_type,
            variables_schema_json=obj.variables_schema_json or [],
            locale=obj.locale,
            version=obj.version,
            is_platform_default=obj.is_platform_default,
            at_organization_id=obj.at_organization_id,
            created_at=obj.created_at,
        )

class TemplatePreviewRequest(BaseModel):
    variables: Dict[str, Any] = {}
    locale: Optional[str] = None

class RestoreVersionRequest(BaseModel):
    change_note: Optional[str] = None

class EntityLinkCreate(BaseModel):
    entity_type: str = Field(..., min_length=1, max_length=150)
    event_name: str = Field(..., min_length=1, max_length=150)
    template_id: int
    email_config_id: Optional[int] = None        # SMTP config override for this link
    recipient_field: str = Field(..., min_length=1, max_length=150)
    cc_fields_json: List[str] = []
    variable_mapping_json: Dict[str, str] = {}
    is_async: bool = True

class EntityLinkUpdate(BaseModel):
    template_id: Optional[int] = None
    email_config_id: Optional[int] = None        # SMTP config override for this link
    recipient_field: Optional[str] = None
    cc_fields_json: Optional[List[str]] = None
    variable_mapping_json: Optional[Dict[str, str]] = None
    is_async: Optional[bool] = None

class EntityLinkResponse(BaseModel):
    nt_entity_template_link_id: int
    entity_type: str
    event_name: str
    nt_email_template_id: int
    nt_email_config_id: Optional[int] = None     # SMTP config override (None = org default)
    recipient_field: str
    cc_fields_json: List[str] = []
    variable_mapping_json: Dict[str, Any] = {}
    is_async: bool
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, obj):
        return cls(
            nt_entity_template_link_id=obj.id,
            entity_type=obj.entity_type,
            event_name=obj.event_name,
            nt_email_template_id=obj.nt_email_template_id,
            # nt_email_config_id=obj.nt_email_config_id,   # ← saved config_id returned here
            nt_email_config_id=getattr(obj, 'nt_email_config_id', None),
            recipient_field=obj.recipient_field,
            cc_fields_json=obj.cc_fields_json or [],
            variable_mapping_json=obj.variable_mapping_json or {},
            is_async=obj.is_async,
            is_active=obj.is_active,
            created_at=obj.created_at,
        )

class Recipient(BaseModel):
    email: str = Field(..., min_length=5)
    name: Optional[str] = None

class AttachmentItem(BaseModel):
    filename: str = Field(..., min_length=1)
    content_type: str = Field(..., min_length=5)
    content_base64: Optional[str] = None
    presigned_url: Optional[str] = None
    size_bytes: int = Field(..., ge=1)

class SendEmailRequest(BaseModel):
    to: List[Recipient] = Field(..., min_length=1)
    cc: List[Recipient] = []
    bcc: List[Recipient] = []
    template_id: int
    variables: Dict[str, Any] = {}
    has_attachment: bool = False
    attachments: List[AttachmentItem] = []
    override_from_email: Optional[str] = None
    override_from_name: Optional[str] = None
    reply_to: Optional[str] = None
    email_config_id: Optional[int] = None
    priority: int = Field(5, ge=1, le=10)
    is_async: bool = True
    correlation_id: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    org_id: Optional[int] = None

class SendRawRequest(BaseModel):
    to: List[Recipient] = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=500)
    html_body: str = Field(..., min_length=1)
    text_body: Optional[str] = None
    has_attachment: bool = False
    attachments: List[AttachmentItem] = []
    email_config_id: Optional[int] = None
    org_id: Optional[int] = None

class SendLogResponse(BaseModel):
    send_log_id: int
    status: str
    subject: str
    to_email_masked: str
    has_attachment: bool
    attachment_count: int
    attachment_names_json: List[str] = []
    retry_count: int
    failure_reason: Optional[str] = None
    provider_message_id: Optional[str] = None
    cc_count: int = 0
    queued_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    created_at: datetime
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, obj):
        return cls(
            send_log_id=obj.id,
            status=obj.status,
            subject=obj.subject,
            to_email_masked=obj.to_email_masked,
            has_attachment=obj.has_attachment,
            attachment_count=obj.attachment_count,
            attachment_names_json=obj.attachment_names_json or [],
            retry_count=obj.retry_count,
            failure_reason=obj.failure_reason,
            provider_message_id=obj.provider_message_id,
            cc_count=obj.cc_count or 0,
            queued_at=obj.queued_at,
            sent_at=obj.sent_at,
            delivered_at=obj.delivered_at,
            opened_at=obj.opened_at,
            created_at=obj.created_at,
            entity_type=obj.entity_type,
            entity_id=obj.entity_id,
        )

class RequeueRequest(BaseModel):
    priority: int = Field(3, ge=1, le=10)