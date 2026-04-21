variable "environment" { type = string }

locals {
  services = [
    "api-gateway",
    "auth-service",
    "user-service",
    "image-service",
    "notification-service",
    "analytics-service",
    "image-worker",
    "ai-service",
  ]
}

resource "aws_ecr_repository" "service" {
  for_each             = toset(local.services)
  name                 = "visioncraft/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "visioncraft-${each.key}" }
}

resource "aws_ecr_lifecycle_policy" "service" {
  for_each   = aws_ecr_repository.service
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

output "registry_url" { value = split("/", aws_ecr_repository.service["api-gateway"].repository_url)[0] }
output "repository_urls" {
  value = { for k, v in aws_ecr_repository.service : k => v.repository_url }
}
