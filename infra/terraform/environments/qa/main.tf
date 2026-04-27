terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "visioncraft"
      Environment = "qa"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  environment = "qa"
}

# ─── Networking ───────────────────────────────────────────────────────────────

module "vpc" {
  source      = "../../modules/vpc"
  environment = local.environment
  aws_region  = var.aws_region
}

# ─── IAM ──────────────────────────────────────────────────────────────────────

module "iam" {
  source         = "../../modules/iam"
  environment    = local.environment
  github_org     = var.github_org
  github_repo    = var.github_repo
  aws_account_id = var.aws_account_id
}

# ─── ECR ──────────────────────────────────────────────────────────────────────

module "ecr" {
  source      = "../../modules/ecr"
  environment = local.environment
}

# ─── ECS Cluster ──────────────────────────────────────────────────────────────

module "ecs_cluster" {
  source      = "../../modules/ecs-cluster"
  environment = local.environment
  vpc_id      = module.vpc.vpc_id
}

# ─── RDS ──────────────────────────────────────────────────────────────────────

module "rds" {
  source             = "../../modules/rds"
  environment        = local.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  rds_sg_id          = module.vpc.rds_sg_id
  db_password        = var.db_password
}

# ─── ElastiCache ──────────────────────────────────────────────────────────────

module "elasticache" {
  source             = "../../modules/elasticache"
  environment        = local.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  redis_sg_id        = module.vpc.redis_sg_id
}

# ─── ALB ──────────────────────────────────────────────────────────────────────

module "alb" {
  source             = "../../modules/alb"
  environment        = local.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  alb_sg_id          = module.vpc.alb_sg_id
  certificate_arn    = var.certificate_arn
}

# ─── S3 + CloudFront (frontend) ───────────────────────────────────────────────

module "s3_frontend" {
  source       = "../../modules/s3-frontend"
  environment  = local.environment
  alb_dns_name = module.alb.alb_dns_name
}

# ─── Secrets stubs ────────────────────────────────────────────────────────────

module "secrets" {
  source      = "../../modules/secrets"
  environment = local.environment
}

# ─── ECS Services ─────────────────────────────────────────────────────────────

module "api_gateway" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "api-gateway"
  image_uri      = "${module.ecr.registry_url}/visioncraft/api-gateway:latest"
  container_port = 3000

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace
  target_group_arn             = module.alb.api_gateway_tg_arn

  environment_vars = {
    SERVICE_NAME              = "api-gateway"
    NODE_ENV                  = "production"
    AWS_ENVIRONMENT           = local.environment
    PORT                      = "3000"
    AUTH_SERVICE_URL          = "http://auth-service:3001"
    USER_SERVICE_URL          = "http://user-service:3002"
    IMAGE_SERVICE_URL         = "http://image-service:3003"
    NOTIFICATION_SERVICE_URL  = "http://notification-service:3004"
    ANALYTICS_SERVICE_URL     = "http://analytics-service:3005"
  }

  secrets = {
    JWT_PUBLIC_KEY = module.secrets.secret_arns["shared/jwt-public-key"]
    REDIS_URL      = module.secrets.secret_arns["shared/redis-url"]
  }
}

module "auth_service" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "auth-service"
  image_uri      = "${module.ecr.registry_url}/visioncraft/auth-service:latest"
  container_port = 3001

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    SERVICE_NAME    = "auth-service"
    NODE_ENV        = "production"
    AWS_ENVIRONMENT = local.environment
    PORT            = "3001"
  }

  secrets = {
    DATABASE_URL          = module.secrets.secret_arns["shared/database-url"]
    REDIS_URL             = module.secrets.secret_arns["shared/redis-url"]
    JWT_PRIVATE_KEY       = module.secrets.secret_arns["auth-service/jwt-private-key"]
    JWT_PUBLIC_KEY        = module.secrets.secret_arns["shared/jwt-public-key"]
    GOOGLE_CLIENT_ID      = module.secrets.secret_arns["auth-service/google-client-id"]
    GOOGLE_CLIENT_SECRET  = module.secrets.secret_arns["auth-service/google-client-secret"]
  }
}

module "user_service" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "user-service"
  image_uri      = "${module.ecr.registry_url}/visioncraft/user-service:latest"
  container_port = 3002

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    SERVICE_NAME    = "user-service"
    NODE_ENV        = "production"
    AWS_ENVIRONMENT = local.environment
    PORT            = "3002"
  }

  secrets = {
    DATABASE_URL = module.secrets.secret_arns["shared/database-url"]
    REDIS_URL    = module.secrets.secret_arns["shared/redis-url"]
  }
}

module "image_service" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "image-service"
  image_uri      = "${module.ecr.registry_url}/visioncraft/image-service:latest"
  container_port = 3003

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    SERVICE_NAME        = "image-service"
    NODE_ENV            = "production"
    AWS_ENVIRONMENT     = local.environment
    PORT                = "3003"
    AWS_REGION          = var.aws_region
    AWS_BUCKET_GENERATED = "qa-ai-images-generated"
    AWS_BUCKET_UPLOADS   = "qa-ai-images-uploads"
    AI_SERVICE_URL      = "http://ai-service:8000"
  }

  secrets = {
    DATABASE_URL = module.secrets.secret_arns["shared/database-url"]
    REDIS_URL    = module.secrets.secret_arns["shared/redis-url"]
  }
}

module "notification_service" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "notification-service"
  image_uri      = "${module.ecr.registry_url}/visioncraft/notification-service:latest"
  container_port = 3004

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    SERVICE_NAME      = "notification-service"
    NODE_ENV          = "production"
    AWS_ENVIRONMENT   = local.environment
    PORT              = "3004"
    AWS_REGION        = var.aws_region
    AWS_SES_FROM_EMAIL = var.ses_from_email
  }
}

module "analytics_service" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "analytics-service"
  image_uri      = "${module.ecr.registry_url}/visioncraft/analytics-service:latest"
  container_port = 3005

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    SERVICE_NAME    = "analytics-service"
    NODE_ENV        = "production"
    AWS_ENVIRONMENT = local.environment
    PORT            = "3005"
  }

  secrets = {
    DATABASE_URL = module.secrets.secret_arns["shared/database-url"]
    REDIS_URL    = module.secrets.secret_arns["shared/redis-url"]
  }
}

module "image_worker" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "image-worker"
  image_uri      = "${module.ecr.registry_url}/visioncraft/image-worker:latest"
  container_port = 3006

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    SERVICE_NAME        = "image-worker"
    NODE_ENV            = "production"
    AWS_ENVIRONMENT     = local.environment
    PORT                = "3006"
    AWS_REGION          = var.aws_region
    AWS_BUCKET_GENERATED = "qa-ai-images-generated"
    AWS_BUCKET_UPLOADS   = "qa-ai-images-uploads"
    IMAGE_SERVICE_URL   = "http://image-service:3003"
    AI_SERVICE_URL      = "http://ai-service:8000"
  }

  secrets = {
    DATABASE_URL = module.secrets.secret_arns["shared/database-url"]
    REDIS_URL    = module.secrets.secret_arns["shared/redis-url"]
  }
}

module "ai_service" {
  source      = "../../modules/ecs-service"
  environment = local.environment
  cluster_arn = module.ecs_cluster.cluster_arn

  service_name   = "ai-service"
  image_uri      = "${module.ecr.registry_url}/visioncraft/ai-service:latest"
  container_port = 8000
  cpu            = 512
  memory         = 1024

  private_subnet_ids           = module.vpc.private_subnet_ids
  app_sg_id                    = module.vpc.app_sg_id
  execution_role_arn           = module.iam.ecs_task_execution_role_arn
  task_role_arn                = module.iam.ecs_task_role_arn
  service_connect_namespace_arn = module.ecs_cluster.service_connect_namespace

  environment_vars = {
    AWS_REGION          = var.aws_region
    AWS_BUCKET_GENERATED = "qa-ai-images-generated"
    SAFETY_ENABLED      = "false"
  }

  secrets = {
    STABILITY_API_KEY = module.secrets.secret_arns["ai-service/stability-api-key"]
    OPENAI_API_KEY    = module.secrets.secret_arns["ai-service/openai-api-key"]
  }
}

# ─── S3 image buckets (re-use existing module in main.tf, or declare here) ───

resource "aws_s3_bucket" "generated_images" {
  bucket = "qa-ai-images-generated"
}

resource "aws_s3_bucket_public_access_block" "generated_images" {
  bucket                  = aws_s3_bucket.generated_images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "uploads" {
  bucket = "qa-ai-images-uploads"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── SES ──────────────────────────────────────────────────────────────────────

resource "aws_ses_email_identity" "sender" {
  email = var.ses_from_email
}
