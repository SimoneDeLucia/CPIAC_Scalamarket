output "node_clients_public_ip" {
  description = "IP Pubblico del nodo dedicato ai Clienti (Subnet 1)"
  value       = aws_instance.k8s_node_clients.public_ip
}

output "node_admin_public_ip" {
  description = "IP Pubblico del nodo dedicato all'Admin (Subnet 2)"
  value       = aws_instance.k8s_node_admin.public_ip
}

output "alb_dns_name" {
  description = "DNS Name dell'Application Load Balancer"
  value       = aws_lb.k8s_alb.dns_name
}
