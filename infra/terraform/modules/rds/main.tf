variable "environment"        { type = string }
variable "private_subnet_ids"  { type = list(string) }
variable "rds_sg_id"           { type = string }
variable "db_name" {
  type    = string
  default = "aiplatform"
}
variable "db_username" {
  type    = string
  default = "visioncraft"
}
variable "db_password" {
  type      = string
  sensitive = true
}
variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

resource "aws_db_subnet_group" "main" {
  name       = "visioncraft-${var.environment}"
  subnet_ids = var.private_subnet_ids
  tags = { Name = "visioncraft-${var.environment}-rds-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier             = "visioncraft-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16.6"
  instance_class         = var.instance_class
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  backup_retention_period = var.environment == "production" ? 7 : 0
  skip_final_snapshot     = var.environment != "production"
  deletion_protection     = var.environment == "production"

  publicly_accessible = false

  tags = { Name = "visioncraft-${var.environment}-postgres" }
}

output "endpoint" { value = aws_db_instance.postgres.endpoint }
output "address"  { value = aws_db_instance.postgres.address }
