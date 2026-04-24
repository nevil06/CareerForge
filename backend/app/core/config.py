from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Carrier-Forge"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@10.255.255.254:3306/carrier_forge"

    # Z.AI (formerly ZhipuAI)
    ZHIPU_API_KEY: str = ""
    GLM_MODEL: str = "glm-5.1"
    GLM_CODER_MODEL: str = "glm-5.1"
    GLM_EMBEDDING_MODEL: str = "embedding-3"

    # Brevo (transactional email via HTTP API)
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = "Carrier-Forge"

    # JSearch API (RapidAPI) — real internet job search
    JSEARCH_API_KEY: str = ""
    JSEARCH_API_HOST: str = "jsearch.p.rapidapi.com"

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://172.28.48.1:3000", "http://172.28.48.1:3001"]

    class Config:
        env_file = ".env"


settings = Settings()
