# CPIAC Scalamarket

![ScalaMarket](Documentazione/img/Scalamarket.jpg)
Realizzazione e deployment locale su Kubernetes e su AWS di un applicazione e-commerce a microservizi 

- Simone De Lucia M63001720

---

# GUIDA PER AVVIO IN LOCALE

### Avvio Barebone (Senza Ingress)

1. Build delle immagini Docker (dalla root del progetto)
```bash
docker build -t cpiac_frontend:v6 -f frontend/Dockerfile frontend/
docker build -t cpiac_auth:v6    -f microservices/auth_service/Dockerfile .
docker build -t cpiac_inventory:v6 -f microservices/inventory_service/Dockerfile .
docker build -t cpiac_order:v6   -f microservices/order_service/Dockerfile .
```

2. Deploy delle risorse
```bash
kubectl apply -f k8s/
```

3. Port-forward per accesso locale
```bash
kubectl port-forward svc/auth-service 5001:5001 &
kubectl port-forward svc/inventory-service 5002:5002 &
kubectl port-forward svc/order-service 5003:5003 &
```

4. Aggiunta di Ingress Controller  NGINX 
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
```

5. Deploy delle risorse in locale
```bash
kubectl apply -f k8s/postgres-pv-pvc.yaml
kubectl apply -f k8s/postgres-configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/auth-deployment.yaml
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/inventory-deployment.yaml
kubectl apply -f k8s/inventory-service.yaml
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/order-service.yaml
```

6. Applica l'Ingress specifico per NGINX (Locale)
```bash
kubectl apply -f k8s/ingress-local.yaml
```

7. (Opzionale) Se i Pod rimangono in stato "Pending" per mancanza di risorse CPU sul tuo PC:
```bash
kubectl scale deployment frontend auth-service inventory-service order-service --replicas=1
```

8. Verifica Ingress e ottieni l'IP
```bash
kubectl get ingress
```


---

# REALIZZAZIONE IMPLEMENTAZIONE AWS

L'esempio è stato implementato al seguente indirizzo: http://scalamarket-alb-171741115.eu-south-1.elb.amazonaws.com.

Per automatizzare il provisioning in Cloud, l'infrastruttura è gestita tramite **Terraform**. 
La configurazione iniziale include:
- **Controllo dei costi (AWS Budget):** È stato impostato un budget mensile (100$), con allarme via email qualora le spese superino l'80% di questa soglia.
- **Application Load Balancer (ALB) con Path-Based Routing:** È configurato un ALB su due Subnet pubbliche in Availability Zone separate. Gestisce l'instradamento inviando le richieste destinate ai path `/admin` e `/inventory` verso l'istanza EC2 **Admin** (nella Subnet 2), e tutto il traffico rimanente verso l'istanza EC2 **Clienti** (nella Subnet 1).

1. Configurare le credenziali AWS ( `aws configure` ) e generare una chiave SSH locale (necessaria a Terraform per garantirti l'accesso remoto ai server). 

2. Viene effettuato il deploy
```bash
cd terraform/

# Inizializzazione dell'ambiente scaricando i provider AWS necessari
terraform init

# Viene verificato ciò che verrà creato su AWS
terraform plan

# Vengono applicati i cambiamenti e creata l'infrastruttura su AWS
terraform apply
```

Al termine dell'esecuzione, verranno restituiti in output i due IP pubblici delle macchine e il \textbf{DNS Name} dell'Application Load Balancer.

**Come accedere all'applicazione e deployare i container:**
1. Collegarsi via SSH ai nodi EC2 utilizzando i seguenti comandi (gli IP sono quelli restituiti in output da Terraform):
2. Eseguire il clone selettivo (\textit{sparse-checkout}) per scaricare sul server solo il codice sorgente necessario alla build e al deploy (escludendo documentazione e terraform):
   ```bash
   git clone --no-checkout https://github.com/SimoneDeLucia/CPIAC_Scalamarket
   cd CPIAC_Scalamarket
   git sparse-checkout init --cone
   git sparse-checkout set frontend init-scripts microservices k8s
   git checkout main
   ```
3. Eseguire le build Docker e il deploy Kubernetes separato per competenza:

   **Nodo Clienti:**

   Essendo i servizi distribuiti su due nodi indipendenti, il servizio ordini ha bisogno di conoscere l'indirizzo pubblico del load balancer per comunicare con l'inventario. (Nota: Se esegui il progetto in ambiente `--LOCAL`, questo step non è necessario in quanto i servizi comunicano tramite il DNS interno `http://inventory-service:5002`).
   
   Il comando viene eseguito per sostituire `URL_ALB` con l'indirizzo del Load Balancer:
   ```bash
   sed -i "s|value: \"http://inventory-service:5002\"|value: \"http://scalamarket-alb-171741115.eu-south-1.elb.amazonaws.com/api/inventory\"|g" k8s/order-deployment.yaml
   ```

   Dopodiché vengono eseguite le build:
   ```bash
   sudo docker build -t cpiac_frontend:v6 -f frontend/Dockerfile frontend/
   sudo docker build -t cpiac_auth:v6    -f microservices/auth_service/Dockerfile .
   sudo docker build -t cpiac_order:v6   -f microservices/order_service/Dockerfile .

   # Esporta le immagini da Docker e importale in K3s (Containerd)
   sudo docker save cpiac_frontend:v6 cpiac_auth:v6 cpiac_order:v6 > clients_images.tar
   sudo k3s ctr images import clients_images.tar

   # Database (Locale al nodo o condiviso)
   sudo kubectl apply -f k8s/postgres-pv-pvc.yaml
   sudo kubectl apply -f k8s/postgres-configmap.yaml
   sudo kubectl apply -f k8s/postgres-deployment.yaml
   sudo kubectl apply -f k8s/postgres-service.yaml

   # Servizi Clienti e Ingress
   sudo kubectl apply -f k8s/frontend-deployment.yaml
   sudo kubectl apply -f k8s/frontend-service.yaml
   sudo kubectl apply -f k8s/auth-deployment.yaml
   sudo kubectl apply -f k8s/auth-service.yaml
   sudo kubectl apply -f k8s/order-deployment.yaml
   sudo kubectl apply -f k8s/order-service.yaml
   sudo kubectl apply -f k8s/ingress.yaml
   ```

   **Nodo Admin:**
   ```bash
   sudo docker build -t cpiac_inventory:v6 -f microservices/inventory_service/Dockerfile .

   # Esporta le immagini da Docker e importale in K3s (Containerd)
   sudo docker save cpiac_inventory:v6 > admin_images.tar
   sudo k3s ctr images import admin_images.tar

   # Database (Locale al nodo o condiviso)
   sudo kubectl apply -f k8s/postgres-pv-pvc.yaml
   sudo kubectl apply -f k8s/postgres-configmap.yaml
   sudo kubectl apply -f k8s/postgres-deployment.yaml
   sudo kubectl apply -f k8s/postgres-service.yaml

   # Servizi Admin e Ingress
   sudo kubectl apply -f k8s/inventory-deployment.yaml
   sudo kubectl apply -f k8s/inventory-service.yaml
   sudo kubectl apply -f k8s/ingress.yaml
   ```
4. **Navigazione:** Va aperto l'indirizzo principale fornito da Terraform. L'ALB smisterà automaticamente il traffico al nodo corretto basandosi sull'URL richiesto.

---

## 3. Schemi Architetturali

**Component Diagram (Microservizi e Ingress)**  
![Component Diagram](Documentazione/img/ComponentDiagram.png)

**Sequence Diagram Cliente**  
![Sequence Diagram](Documentazione/img/SequenceDiagram.png)

**Use Case Diagram (Separazione dei poteri)**  
![Use Case Diagram](Documentazione/img/UseCaseDiagram.png)

**Architettura AWS (Terraform)**  
![AWS Architecture](Documentazione/img/AWSArchitecture.png)


