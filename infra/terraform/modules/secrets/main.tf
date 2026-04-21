# Creates Secrets Manager secrets and SSM parameters as empty stubs.
# Populate values manually after terraform apply (see docs/QA_DEPLOYMENT.md Phase 3).

variable "environment" { type = string }

locals {
  secrets = [
    "shared/database-url",
    "shared/redis-url",
    "shared/jwt-public-key",
    "auth-service/jwt-private-key",
    "auth-service/google-client-id",
    "auth-service/google-client-secret",
    "ai-service/stability-api-key",
    "ai-service/openai-api-key",
  ]

  ssm_params = [
    "/visioncraft/${var.environment}/auth-service/google-callback-url",
    "/visioncraft/${var.environment}/api-gateway/allowed-origins",
    "/visioncraft/${var.environment}/shared/launchdarkly-sdk-key",
  ]
}

resource "aws_secretsmanager_secret" "service" {
  for_each = toset(local.secrets)
  name     = "visioncraft/${var.environment}/${each.key}"

  # Prevent accidental deletion
  recovery_window_in_days = var.environment == "production" ? 7 : 0

  tags = { Environment = var.environment }
}

resource "aws_ssm_parameter" "config" {
  for_each = toset(local.ssm_params)
  name     = each.key
  type     = "String"
  value    = "PLACEHOLDER — populate via aws ssm put-parameter"

  lifecycle {
    # Never overwrite a value set outside Terraform
    ignore_changes = [value]
  }
}

output "secret_arns" {
  value = { for k, v in aws_secretsmanager_secret.service : k => v.arn }
}
