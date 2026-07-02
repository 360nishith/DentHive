# Identity & Authentication API

This module handles authentication, staff management (Users), and tenant configuration.

---

## 1. Authentication Endpoints

### `POST /auth/login`
Authenticates a user via phone number and password, returning a JWT.

*   **Security:** Public
*   **Request DTO (`LoginDto`):**
    ```typescript
    {
      @IsPhoneNumber('IN') phoneNumber: string;
      @IsString() @IsNotEmpty() password: string;
    }
    ```
*   **Response (`200 OK`):**
    ```json
    {
      "accessToken": "eyJhb...",
      "user": {
        "id": "uuid",
        "role": "DENTIST",
        "tenantId": "uuid"
      }
    }
    ```
*   **Validation Rules:**
    *   `401 Unauthorized` if credentials mismatch.
    *   `403 Forbidden` if the `User` or `Tenant` status is `SUSPENDED`.

---

## 2. User (Staff) Management Endpoints

### `POST /users`
Creates a new staff member for the clinic.

*   **Security:** Bearer Token. Role: `DENTIST` (Owner).
*   **Request DTO (`CreateUserDto`):**
    ```typescript
    {
      @IsString() @IsNotEmpty() name: string;
      @IsPhoneNumber('IN') phoneNumber: string;
      @IsEmail() @IsOptional() email?: string;
      @IsEnum(['DENTIST', 'ASSISTANT']) role: string;
    }
    ```
*   **Response (`201 Created`):**
    ```json
    {
      "id": "uuid",
      "name": "Shaila",
      "role": "ASSISTANT",
      "isActive": true
    }
    ```

### `GET /users`
Lists all staff members for the current tenant.

*   **Security:** Bearer Token.
*   **Response (`200 OK`):** Paginated User envelope.

### `PATCH /users/:id/status`
Activates or deactivates a staff member (Soft Delete / Suspension).

*   **Security:** Bearer Token. Role: `DENTIST`.
*   **Request DTO (`UpdateUserStatusDto`):**
    ```typescript
    {
      @IsBoolean() isActive: boolean;
    }
    ```

---

## 3. Tenant Configuration Endpoints

### `GET /tenant/settings`
Retrieves the clinic's public and private settings (e.g., UPI VPA).

*   **Security:** Bearer Token.
*   **Response (`200 OK`):**
    ```json
    {
      "id": "uuid",
      "name": "Shenoy Dental",
      "subdomain": "shenoy",
      "upiVpa": "shenoy@okicici"
    }
    ```

### `PATCH /tenant/settings`
Updates clinic settings.

*   **Security:** Bearer Token. Role: `DENTIST`.
*   **Request DTO (`UpdateTenantSettingsDto`):**
    ```typescript
    {
      @IsString() @IsOptional() name?: string;
      @IsString() @IsOptional() upiVpa?: string; // Validated against standard UPI formats
    }
    ```
