# Reusable module — one ECS service + task definition per microservice

variable "environment"           { type = string }
variable "cluster_arn"           { type = string }
variable "service_name"          { type = string }
variable "image_uri"             { type = string }
variable "container_port"        { type = number }
variable "cpu" {
  type    = number
  default = 256
}
variable "memory" {
  type    = number
  default = 512
}
variable "desired_count" {
  type    = number
  default = 1
}
variable "private_subnet_ids"    { type = list(string) }
variable "app_sg_id"             { type = string }
variable "execution_role_arn"    { type = string }
variable "task_role_arn"         { type = string }
variable "service_connect_namespace_arn" { type = string }

# Secrets and SSM parameters are passed as a map: { env_var_name => secret_arn_or_ssm_arn }
variable "secrets" {
  type    = map(string)
  default = {}
}
variable "environment_vars" {
  type    = map(string)
  default = {}
}

# ALB target group ARN — only api-gateway sets this; other services leave it null
variable "target_group_arn" {
  type    = string
  default = null
}

locals {
  log_group = "/ecs/visioncraft-${var.environment}/${var.service_name}"
}

resource "aws_cloudwatch_log_group" "service" {
  name              = local.log_group
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "service" {
  family                   = "visioncraft-${var.environment}-${var.service_name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = var.service_name
    image     = var.image_uri
    essential = true

    portMappings = [{
      name          = var.service_name
      containerPort = var.container_port
      protocol      = "tcp"
    }]

    environment = [
      for k, v in var.environment_vars : { name = k, value = v }
    ]

    secrets = [
      for k, v in var.secrets : { name = k, valueFrom = v }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = local.log_group
        "awslogs-region"        = "ap-south-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  depends_on = [aws_cloudwatch_log_group.service]
}

resource "aws_ecs_service" "service" {
  name            = var.service_name
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.service.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.app_sg_id]
    assign_public_ip = false
  }

  service_connect_configuration {
    enabled   = true
    namespace = var.service_connect_namespace_arn

    service {
      port_name      = var.service_name
      discovery_name = var.service_name
      client_alias {
        port     = var.container_port
        dns_name = var.service_name
      }
    }
  }

  dynamic "load_balancer" {
    for_each = var.target_group_arn != null ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}

output "service_name" { value = aws_ecs_service.service.name }
output "task_definition_arn" { value = aws_ecs_task_definition.service.arn }
