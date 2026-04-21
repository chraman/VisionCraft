# ─── Outputs ──────────────────────────────────────────────────────────────────
# These values are needed for manual steps (Phase 3-6 in QA_DEPLOYMENT.md)
# and must be added as GitHub secrets in the qa environment (Phase 4).

output "alb_dns_name" {
  description = "ALB DNS name — set as ALB_QA_URL GitHub secret (prefix with https://)"
  value       = module.alb.alb_dns_name
}

output "cloudfront_domain" {
  description = "CloudFront domain for the QA frontend SPA"
  value       = module.s3_frontend.cloudfront_domain
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — set as CF_DISTRIBUTION_ID_QA GitHub secret"
  value       = module.s3_frontend.cloudfront_distribution_id
}

output "ecr_registry" {
  description = "ECR registry URL — set as ECR_REGISTRY GitHub secret"
  value       = module.ecr.registry_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name — set as ECS_CLUSTER_QA GitHub secret"
  value       = module.ecs_cluster.cluster_name
}

output "private_subnet_id" {
  description = "One private subnet ID — for ECS one-off task network config (Phase 6)"
  value       = module.vpc.private_subnet_id
}

output "app_security_group_id" {
  description = "App security group ID — for ECS one-off task network config (Phase 6)"
  value       = module.vpc.app_sg_id
}

output "rds_endpoint" {
  description = "RDS internal endpoint — for building DATABASE_URL secret (Phase 3)"
  value       = module.rds.endpoint
  sensitive   = true
}

output "elasticache_endpoint" {
  description = "ElastiCache primary endpoint — for building REDIS_URL secret (Phase 3)"
  value       = module.elasticache.primary_endpoint
}

output "s3_frontend_bucket" {
  description = "Frontend S3 bucket name — set as S3_FRONTEND_BUCKET_QA GitHub secret"
  value       = module.s3_frontend.bucket_name
}
