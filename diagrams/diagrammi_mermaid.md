# Diagrammi UML in Mermaid

Di seguito i codici sorgente dei diagrammi realizzati in linguaggio **Mermaid.js**. Puoi visualizzarli direttamente qui, oppure copiarli su [Mermaid Live Editor](https://mermaid.live/) per scaricare le immagini PNG.

---

## 1. Sequence Diagram (Logistica e Ordini)
```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as Frontend
    participant A as Auth Service
    participant I as Inventory Service
    participant O as Order Service
    participant DB as PostgreSQL

    %% Caso d'uso: Login / Registrazione
    rect rgb(240, 248, 255)
        note right of C: 1. Autenticazione (Login/Registrazione)
        C->>F: Inserisce credenziali (Username/Password)
        F->>A: POST /api/auth/client/login (o /register)
        A->>DB: Verifica/Salva credenziali
        DB-->>A: Risposta query
        A-->>F: JWT Token o messaggio di successo
        F-->>C: Accesso consentito alla Dashboard
    end

    %% Caso d'uso: Consultazione Catalogo
    rect rgb(245, 255, 250)
        note right of C: 2. Consultazione Catalogo
        C->>F: Naviga nella pagina articoli
        F->>I: GET /api/inventory/articles
        I->>DB: Query tutti gli articoli e giacenze
        DB-->>I: Lista articoli
        I-->>F: JSON con catalogo e disponibilità
        F-->>C: Mostra griglia prodotti
    end

    %% Caso d'uso: Aggiunta al Carrello
    rect rgb(255, 250, 240)
        note right of C: 3. Gestione Carrello
        C->>F: Clicca "Aggiungi al carrello"
        F->>F: Verifica disponibilità residua (cache locale)
        F-->>C: Aggiorna badge carrello
    end

    %% Caso d'uso: Creazione Ordine (Checkout)
    rect rgb(255, 240, 245)
        note right of C: 4. Checkout / Creazione Ordine
        C->>F: Conferma l'ordine
        F->>O: POST /api/orders/place
        O->>I: Chiamata HTTP sincrona (Verifica Stock Globale)
        I->>DB: Controlla giacenze su tutte le filiali
        
        alt Stock Sufficiente
            DB-->>I: Giacenze OK
            I-->>O: 200 OK (Quantità prenotate)
            O->>DB: Salva l'ordine con stato "In elaborazione"
            DB-->>O: ID Ordine generato
            O-->>F: 201 Created (Ordine effettuato con successo)
            F-->>C: Notifica di successo e svuotamento carrello
        else Stock Insufficiente
            DB-->>I: Giacenze Esaurite
            I-->>O: 400 Bad Request
            O-->>F: 400 Errore "Articoli non disponibili"
            F-->>C: Notifica di errore al Cliente
        end
    end
```

---

## 2. Component Diagram
```mermaid
flowchart TB
    Client(["Utenti (Clienti / Admin)"])

    subgraph Cluster ["Ambiente (Kubernetes / AWS)"]
        Ingress["App Load Balancer e Ingress"]
        
        subgraph FL ["Frontend Layer"]
            FE["Frontend Service (HTML / JS)"]
        end
        
        subgraph BL ["Business Logic (Microservizi)"]
            Auth["Auth Service (5001)"]
            Inv["Inventory Service (5002)"]
            Ord["Order Service (5003)"]
        end
        
        subgraph DL ["Data Storage Layer"]
            DB[("PostgreSQL Database")]
        end
    end

    Client -->|Richieste Web e API| Ingress
    Ingress -->|Path: /| FE
    Ingress -->|Path: /api/auth| Auth
    Ingress -->|Path: /api/inventory| Inv
    Ingress -->|Path: /api/orders| Ord

    Ord -.->|Comunicazione Sincrona HTTP| Inv

    Auth -->|Read/Write| DB
    Inv -->|Read/Write| DB
    Ord -->|Read/Write| DB

    classDef ms fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    class Auth,Inv,Ord ms;
    classDef db fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    class DB db;
    classDef fe fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    class FE fe;
    classDef proxy fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    class Ingress proxy;
```

---

## 3. Use Case Diagram
*Nota: Mermaid non ha diagrammi Use Case nativi, ma possiamo ottenerne una versione elegante e pulita tramite un flowchart LR.*

```mermaid
flowchart LR
    %% Attori
    Admin(["👤 Amministratore Globale"])
    Gestore(["👤 Gestore Filiale"])
    Cliente(["👤 Cliente Finale"])

    %% Sistema Unificato
    subgraph Sistema ["SISTEMA SCALAMARKET"]
        
        %% Casi d'uso Amministrazione
        subgraph Amministrazione ["Area Amministrazione"]
            direction TB
            UC1([Rimuovi ordini globali])
            UC2([Cancella utenti e clienti])
        end

        %% Casi d'uso Filiale
        subgraph Filiale ["Area Gestione Filiale"]
            direction TB
            UC4([Visualizza gli articoli in catalogo])
            UC5([Gestisci le giacenze della propria filiale])
            UC6([Monitora spedizioni della propria filiale])
            UC12([Aggiungi e rimuovi articoli dal catalogo])
        end

        %% Casi d'uso Clienti
        subgraph Clienti ["Area Clienti"]
            direction TB
            UC7([Registrazione e Accesso al portale])
            UC8([Sfoglia catalogo e verifica disponibilità])
            UC9([Gestione del carrello della spesa])
            UC10([Effettua un ordine e Checkout])
            UC11([Visualizza lo storico dei propri ordini])
        end
    end

    %% Relazioni Amministratore
    Admin --> UC1
    Admin --> UC2

    %% Relazioni Gestore
    Gestore --> UC4
    Gestore --> UC5
    Gestore --> UC6
    Gestore --> UC12

    %% Relazioni Cliente
    Cliente --> UC7
    Cliente --> UC8
    Cliente --> UC9
    Cliente --> UC10
    Cliente --> UC11

    classDef attore fill:#fce4ec,stroke:#880e4f,stroke-width:2px;
    class Admin,Gestore,Cliente attore;
    
    classDef casoDuso fill:#e8eaf6,stroke:#1a237e,stroke-width:1px;
    class UC1,UC2,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12 casoDuso;
```
