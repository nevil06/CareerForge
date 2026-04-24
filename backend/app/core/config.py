from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Carrier-Forge"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:password@10.255.255.254:3306/carrier_forge"

    # ZhipuAI (GLM)
    ZHIPU_API_KEY: str = ""

    # Brevo (transactional email via HTTP API)
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = ""
    BREVO_SENDER_NAME: str = "Carrier-Forge"

    # External Job API (Adzuna)
    JOB_API_URL: str = "https://api.adzuna.com/v1/api/jobs"
    JOB_API_APP_ID: str = ""
    JOB_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
