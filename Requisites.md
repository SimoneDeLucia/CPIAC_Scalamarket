# Proposta di Progetto: Piattaforma a Microservizi per Logistica Minimarket in Cloud

## 1. Descrizione del Dominio e Requisiti Funzionali
Il progetto mira a realizzare una piattaforma web per la gestione di una catena di minimarket distribuita su tre sedi geografiche differenti. Il sistema prevede due tipologie di attori principali: **Clienti** e **Amministratori**.

* **Lato Cliente:**
    * Visualizzazione del catalogo articoli disponibili.
    * Effettuazione di ordini e monitoraggio dello stato di spedizione.
    * Gestione e visualizzazione del proprio profilo utente.
* **Lato Amministrazione (Ruoli Separati):**
    * **Amministratore Globale:** 
        * Gestione e visualizzazione degli utenti registrati della piattaforma web.
        * Eliminazione degli articoli dal catalogo e rimozione veicoli.
        * Visualizzazione della tabella globale di logistica e utilizzo mezzi.
    * **Gestore Filiale:**
        * Visualizzazione mirata degli articoli e dei veicoli a disposizione della propria filiale.
        * Aggiunta e rimozione di articoli, giacenze e mezzi esclusivamente limitati alla propria filiale.
        * L'infrastruttura è Multi-Tenant: l'accesso di una filiale avviene su un singolo sistema (Pod) partizionato logicamente per `location_id`.
* **Logica di Business (Routing degli Ordini):**
    * Quando un utente autenticato effettua un ordine, il sistema valuta dinamicamente la disponibilità degli articoli richiesti nelle varie sedi e la disponibilità dei mezzi logistici, calcolando e assegnando la filiale ottimale da cui far partire la consegna.

## 2. Fase 1: Implementazione Architetturale (Flask & Kubernetes)
L'applicazione sarà sviluppata seguendo il pattern architetturale a **microservizi**, esponendo interfacce tramite **REST API**. Il backend sarà implementato utilizzando il framework **Python Flask**.

### 2.1 Suddivisione in Microservizi
* **Auth & User Service:** Gestisce l'autenticazione e i profili di clienti e amministratori.
* **Inventory & Catalog Service:** Gestisce il CRUD degli articoli e traccia le giacenze distribuite sulle tre sedi.
* **Order & Logistics Service:** Implementa la logica decisionale per l'assegnazione dell'ordine alla filiale ottimale in base a scorte e mezzi.
* **Database:** Ogni microservizio (o gruppo logico) avrà il proprio database isolato (es. PostgreSQL o MySQL).

### 2.2 Containerizzazione e Orchestrazione (Kubernetes)
* **Docker:** Ogni microservizio Flask sarà pacchettizzato tramite un proprio `Dockerfile`.
* **Kubernetes (K8s):** L'intero ecosistema sarà orchestrato tramite un cluster Kubernetes per garantire alta affidabilità e scalabilità.
    * Utilizzo di **Deployments** per definire le repliche desiderate per ogni microservizio.
    * Utilizzo di **Services** (`ClusterIP`, `NodePort` o `LoadBalancer`) per la comunicazione interna ed esterna.
    * Utilizzo di **Persistent Volumes (PV)** e **Persistent Volume Claims (PVC)** per garantire la persistenza dei dati nei database.

### 2.3 Guida all'Implementazione e Architettura in Kubernetes

Questa è la sequenza logica delle operazioni da tradurre in file YAML (manifest) per eseguire e orchestrare il progetto a microservizi.

**Passo 1: Containerizzazione (Docker)**
Ogni microservizio (Auth, Inventory, Orders, e il Frontend) deve essere pacchettizzato. Scriverai un `Dockerfile` per ciascun servizio in Flask e creerai le relative immagini Docker.

**Passo 2: Definizione dei Deployment (I Pod)**
Per ogni microservizio creerai un oggetto `Deployment`.
* **Cosa fa:** Assicura che un certo numero di copie (repliche) del microservizio sia sempre in esecuzione, riavviandole in caso di guasti ai nodi fisici.
* *Applicazione:* Avrai file di configurazione come `auth-deployment.yaml`, `inventory-deployment.yaml`, ecc.

**Passo 3: Esposizione Interna tramite Service (ClusterIP)**
I Pod sono effimeri e il loro indirizzo IP cambia in continuazione.
* **Cosa fa:** Creerai un `Service` di tipo **ClusterIP** per ogni microservizio e database, fornendo un IP virtuale fisso e un nome DNS interno (es. `http://inventory-service`).
* *Applicazione:* L'Order Service contatterà l'Inventory Service in modo affidabile tramite `http://inventory-service:5000/api/check-stock`.

**Passo 4: Gestione della Persistenza (Database)**
* **Cosa fa:** Utilizzerai oggetti `PersistentVolume` (PV) e `PersistentVolumeClaim` (PVC) per agganciare storage persistente ai Pod dei database (es. PostgreSQL), evitando la perdita degli ordini o del catalogo in caso di riavvio del container.

**Passo 5: Esposizione Esterna verso i Clienti (NodePort o LoadBalancer)**
* **Cosa fa:** Creerai un `Service` di tipo **LoadBalancer** (che istruisce il cloud AWS a creare un bilanciatore reale) o **NodePort** per rendere raggiungibile il sito web dall'esterno del cluster.

#### L'Architettura di Rete (Il cuore dell'esame)
1. **La Rete dei Pod (CNI):** Ogni Pod riceve un indirizzo IP reale in una sottorete virtuale (spesso gestita da plugin come Flannel o Calico). Ogni Pod comunica con gli altri senza bisogno di NAT.
2. **Risoluzione DNS Interna:** Il componente CoreDNS risolve i nomi dei Service nei rispettivi IP virtuali all'interno del cluster.
3. **Instradamento (Kube-Proxy e iptables):** L'agente `kube-proxy` aggiorna le regole del firewall `iptables` sui vari nodi per intercettare il traffico diretto all'IP virtuale fittizio del Service e instradarlo (effettuando Load Balancing) verso gli IP reali dei Pod in esecuzione.

#### Aspetti da approfondire per l'esame
* Funzionamento di `kube-proxy` e del routing tramite regole `iptables`.
* Differenza netta e casi d'uso tra i tipi di Service: `ClusterIP`, `NodePort` e `LoadBalancer`.
* Il ruolo della Container Network Interface (CNI) nella creazione della rete overlay.


## 3. Fase 2: Deployment in Cloud (AWS & Infrastructure-as-Code)
Il deployment dell'architettura Kubernetes non avverrà manualmente, ma sfrutterà l'automazione infrastrutturale.

### 3.1 Servizi AWS Coinvolti
* **Amazon EC2 & VPC:** Creazione di una Virtual Private Cloud (VPC) contenente le istanze EC2 che fungeranno da nodi per il cluster Kubernetes.
* **Amazon ELB (Elastic Load Balancer):** Configurato per bilanciare il traffico in ingresso e instradarlo verso i nodi del cluster Kubernetes.
* **Amazon S3 (Opzionale):** Utilizzato per l'hosting degli asset statici dell'interfaccia web o lo storage delle immagini degli articoli.

### 3.2 Infrastructure-as-Code (Terraform)
* **Provisioning Automatizzato:** L'intera infrastruttura AWS (VPC, Subnet, Security Group, Istanze EC2, Load Balancer) sarà descritta e creata tramite script **Terraform**.
* **Riproducibilità:** Il progetto dimostrerà che l'ambiente di produzione può essere creato e distrutto (spin-up e tear-down) in modo completamente automatizzato tramite i comandi di Terraform (`terraform plan`, `terraform apply`).

### 3.3 Guida AWS

**Passo 1: Gestione delle Identità e degli Accessi (AWS IAM)**
* **In pratica:** Crei un Utente programmatico IAM con i permessi appropriati per la creazione di risorse e generi le credenziali `Access Key ID` e `Secret Access Key`.
* **Teoria:** IAM è il sistema di sicurezza centrale. Terraform utilizzerà queste chiavi per autenticare le richieste API inviate ad AWS a tuo nome.

**Passo 2: Creazione del Data Center Virtuale (Amazon VPC)**
* **In pratica:** Definisci una Virtual Private Cloud (VPC) contenente:
  * Un **Internet Gateway (IGW)** per permettere l'accesso a Internet.
  * **Subnet Pubbliche** (dove esporrai i Load Balancer) e **Subnet Private** (dove nasconderai i nodi Kubernetes e i database).
  * **Tabelle di Routing** per instradare il traffico tra le subnet e l'esterno.
  * **Security Group** (firewall) per aprire solo le porte strettamente necessarie (es. porte web 80/443 e porte interne di comunicazione per Kubernetes).
* **Teoria:** La VPC garantisce l'isolamento di rete nel cloud pubblico. I Security Group sono controlli "stateful" associati direttamente alle interfacce di rete delle istanze.

**Passo 3: Provisioning dei Nodi Kubernetes (Amazon EC2)**
* **In pratica:** Lanci le istanze EC2 (i server fisici virtualizzati, es. un Master e due Worker) specificando l'Amazon Machine Image (AMI, come Ubuntu), l'Instance Type (es. `t2.medium`) e le chiavi SSH.
* **Teoria:** EC2 è il servizio IaaS di calcolo base. Tramite script di automazione inseriti nei metadati (`user_data`), Terraform può far installare i componenti di Kubernetes all'avvio della macchina.

**Passo 4: Bilanciamento del traffico in ingresso (Amazon ELB)**
* **In pratica:** Crei un **Application Load Balancer (ALB)** nelle subnet pubbliche. L'ALB riceve il traffico degli utenti e lo inoltra verso i nodi worker EC2 (registrati in un *Target Group*) che a loro volta lo passano a Kubernetes.
* **Teoria:** L'ELB garantisce disponibilità e bilanciamento. Sfrutta gli `Health Check` per assicurarsi di instradare il traffico dei clienti del minimarket solo verso i nodi funzionanti.

**Passo 5: Archiviazione Statica (Amazon S3 - Consigliato)**
* **In pratica:** Crei un bucket S3. Il microservizio catalogo salverà qui le immagini degli articoli, conservando nel database relazionale solo il link (URL) all'immagine.
* **Teoria:** S3 è un servizio di Object Storage ad altissima durabilità e disponibilità, molto più scalabile ed economico di un disco a blocchi (EBS) per memorizzare file statici e pesanti.

#### Il Tassello Finale: Infrastructure-as-Code (Terraform)
* **Teoria:** Terraform utilizza un approccio **dichiarativo**. L'utente descrive l'infrastruttura di arrivo desiderata e il motore di Terraform calcola e orchestra le API necessarie per costruire quell'ambiente riproducibile (`terraform plan` e `terraform apply`).

#### Aspetti da approfondire per l'esame
* Saper illustrare e giustificare riga per riga i propri file di configurazione `.tf`.
* Saper spiegare logicamente le regole *Ingress* ed *Egress* configurate nei Security Group.
* Ricostruire a voce l'intero flusso di rete: l'utente su Internet -> Internet Gateway -> ALB (Subnet Pubblica) -> EC2 Worker (Subnet Privata) -> kube-proxy/iptables -> Pod Flask.