variable "environment" { type = string }
variable "vpc_id"      { type = string }

resource "aws_ecs_cluster" "main" {
  name = "visioncraft-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "visioncraft-${var.environment}" }
}

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "internal"
  description = "ECS Service Connect namespace for visioncraft-${var.environment}"
  vpc         = var.vpc_id
}

output "cluster_name"              { value = aws_ecs_cluster.main.name }
output "cluster_arn"               { value = aws_ecs_cluster.main.arn }
output "service_connect_namespace" { value = aws_service_discovery_private_dns_namespace.main.arn }
