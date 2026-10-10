variable "aws_region" {
  description = "AWS Region per il deployment"
  default     = "eu-south-1"
}


variable "instance_type" {
  description = "Tipologia di istanza EC2 per i nodi K8s"
  default     = "t3.medium"
}

variable "enable_https" {
  description = "Abilita il supporto HTTPS (import certificato ACM, listener 443 e regole di routing)"
  type        = bool
  default     = true
}

variable "redirect_http_to_https" {
  description = "Se true, reindirizza automaticamente il traffico HTTP (porta 80) verso HTTPS (porta 443). Se false, mantiene attivi entrambi i protocolli."
  type        = bool
  default     = false
}

variable "certificate_body_path" {
  description = "Percorso relativo del certificato SSL (.crt)"
  type        = string
  default     = "../creds/certificate.crt"
}

variable "private_key_path" {
  description = "Percorso relativo della chiave privata SSL (.key)"
  type        = string
  default     = "../creds/private.key"
}
