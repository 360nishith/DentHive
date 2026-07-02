# Database Entity-Relationship (ER) Diagram

This document provides a high-level visual representation of the core data entities and their relationships within the DentalFlow system. 

The schema is built around the `Tenant` (Clinic) as the root boundary for almost all tables to enforce Row-Level Security (RLS).

---

## Core Schema ER Diagram

```mermaid
erDiagram
    TENANTS ||--o{ SUBSCRIPTIONS : "has"
    TENANTS ||--o{ USERS : "employs"
    TENANTS ||--o{ PATIENTS : "treats"
    TENANTS ||--o{ TREATMENT_TEMPLATES : "defines"
    TENANTS ||--o{ TREATMENT_JOURNEYS : "manages"
    TENANTS ||--o{ AUDIT_LOGS : "records"
    
    USERS }|--|| ROLES : "has"
    
    PATIENTS ||--o{ FILES : "owns"
    PATIENTS ||--o{ TREATMENT_JOURNEYS : "undergoes"
    PATIENTS ||--o{ RECALL_LISTS : "enrolled_in"
    PATIENTS ||--o{ WHATSAPP_MESSAGES : "receives"
    
    TREATMENT_TEMPLATES ||--|{ TEMPLATE_STAGES : "contains"
    
    TREATMENT_JOURNEYS ||--|| TREATMENT_TEMPLATES : "instantiates"
    TREATMENT_JOURNEYS ||--|{ TREATMENT_STAGES : "progresses_through"
    TREATMENT_JOURNEYS ||--o{ PAYMENTS : "billed_via"
    
    TREATMENT_STAGES ||--o| APPOINTMENTS : "scheduled_for"
    TREATMENT_STAGES ||--o{ FOLLOW_UPS : "triggers"
    
    APPOINTMENTS ||--o{ WHATSAPP_MESSAGES : "related_to"
    
    %% Entity Definitions with Key Columns
    TENANTS {
        uuid id PK
        string name
        string subdomain UK
        string upi_vpa
    }
    
    SUBSCRIPTIONS {
        uuid id PK
        uuid tenant_id FK
        string plan_tier
        string razorpay_sub_id
        string status
    }

    USERS {
        uuid id PK
        uuid tenant_id FK
        uuid role_id FK
        string email UK
        string phone_number
        string password_hash
    }

    ROLES {
        uuid id PK
        string name "e.g., DENTIST, ASSISTANT"
    }

    PATIENTS {
        uuid id PK
        uuid tenant_id FK
        string name
        string phone_number
        boolean whatsapp_opt_in
        string preferred_language
    }

    TREATMENT_TEMPLATES {
        uuid id PK
        uuid tenant_id FK
        string name
        int estimated_cost
    }
    
    TEMPLATE_STAGES {
        uuid id PK
        uuid template_id FK
        int sequence_order
        string name
        int default_interval_days
    }

    TREATMENT_JOURNEYS {
        uuid id PK
        uuid tenant_id FK
        uuid patient_id FK
        uuid template_id FK
        uuid current_stage_id FK
        string status "ACTIVE, STALLED, COMPLETED"
        int total_cost
    }

    TREATMENT_STAGES {
        uuid id PK
        uuid tenant_id FK
        uuid journey_id FK
        uuid template_stage_id FK
        string status "PENDING, COMPLETED"
        datetime completed_at
    }

    APPOINTMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid patient_id FK
        uuid treatment_stage_id FK
        datetime scheduled_start
        datetime scheduled_end
        string status "SCHEDULED, CANCELLED, NO_SHOW, COMPLETED"
    }

    PAYMENTS {
        uuid id PK
        uuid tenant_id FK
        uuid journey_id FK
        int amount
        string status "PENDING, SUCCESS, FAILED"
        string payment_method "UPI, CASH"
    }

    WHATSAPP_MESSAGES {
        uuid id PK
        uuid tenant_id FK
        uuid patient_id FK
        string message_type "TEMPLATE, FREE_FORM"
        string status "SENT, DELIVERED, READ, FAILED"
        jsonb payload
    }
    
    FOLLOW_UPS {
        uuid id PK
        uuid tenant_id FK
        uuid stage_id FK
        datetime trigger_at
        string status "PENDING, PROCESSED"
    }

    RECALL_LISTS {
        uuid id PK
        uuid tenant_id FK
        uuid patient_id FK
        date recall_date
        string reason
    }
    
    FILES {
        uuid id PK
        uuid tenant_id FK
        uuid patient_id FK
        string file_url
        string file_type "IMAGE, PDF"
    }
    
    AUDIT_LOGS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb changes
    }
```
