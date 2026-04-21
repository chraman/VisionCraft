variable "environment"        { type = string }
variable "private_subnet_ids"  { type = list(string) }
variable "redis_sg_id"         { type = string }
variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "visioncraft-${var.environment}"
  subnet_ids = var.private_subnet_ids
  tags = { Name = "visioncraft-${var.environment}-redis-subnet-group" }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "visioncraft-${var.environment}"
  description          = "VisionCraft ${var.environment} Redis"

  node_type               = var.node_type
  num_cache_clusters      = 1
  port                    = 6379
  engine_version          = "7.1"
  parameter_group_name    = "default.redis7"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_sg_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # keep false so redis:// URL works without TLS config

  tags = { Name = "visioncraft-${var.environment}-redis" }
}

output "primary_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}
