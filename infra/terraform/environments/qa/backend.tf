terraform {
  backend "s3" {
    bucket         = "visioncraft-terraform-state"
    key            = "environments/qa/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "visioncraft-terraform-locks"
    encrypt        = true
  }
}
