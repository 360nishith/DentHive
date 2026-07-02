# DentalFlow System Overview (For Founders)

This document explains the entire DentalFlow system in simple, plain English. It breaks down what each part of the software does, why we built it, how the clinic uses it, and the potential business risks to watch out for.

---

### 1. Authentication (Logging In)
*   **Purpose:** The security gatekeeper of the software.
*   **Why it exists:** To ensure that only authorized dentists and staff can access sensitive patient medical and financial data.
*   **User workflow:** A dentist goes to `clinic.dentalflow.co`, types in their email and password, and gets securely logged into their dashboard.
*   **Data involved:** Emails, encrypted passwords, and secure login "tokens".
*   **Risks:** If a staff member shares their password, or leaves their computer unlocked, someone else could view private patient records.

### 2. Clinics (Tenancy)
*   **Purpose:** The "digital building" that houses everything.
*   **Why it exists:** DentalFlow is a "multi-tenant" system. This means hundreds of clinics use the same software, but we need an invisible wall between them so Clinic A can never see Clinic B's patients.
*   **User workflow:** When a new dentist signs up, the system automatically creates a brand new, empty "Clinic" space just for them.
*   **Data involved:** Clinic name, address, tax ID, and a unique identifier (Tenant ID) attached to every single piece of data they create.
*   **Risks:** If the software's invisible walls are built incorrectly, data could leak between competing clinics. (We have heavily guarded against this).

### 3. Users (Staff & Roles)
*   **Purpose:** Managing who works at the clinic and what they are allowed to do.
*   **Why it exists:** A receptionist needs to book appointments, but shouldn't be able to delete invoices or view the clinic's total monthly revenue.
*   **User workflow:** The Head Dentist goes to settings and invites a new receptionist, giving them the "Staff" role rather than the "Dentist" role.
*   **Data involved:** Staff names, emails, roles, and strict permission rules.
*   **Risks:** The Head Dentist accidentally giving a temporary assistant "Admin" powers, allowing them to delete important records.

### 4. Patients
*   **Purpose:** The digital filing cabinet for the people being treated.
*   **Why it exists:** To replace paper files. The clinic needs a central place to look up a patient's phone number, medical history, and signed consent forms.
*   **User workflow:** A new patient walks in. The receptionist types their name, phone number, and age into the system.
*   **Data involved:** Names, WhatsApp phone numbers, ages, and links to X-rays or signed consent forms.
*   **Risks:** Entering the wrong phone number, which means the patient will never receive their automated WhatsApp reminders.

### 5. Treatment Journeys
*   **Purpose:** The roadmap for fixing a patient's dental problem.
*   **Why it exists:** Most dental procedures (like a Root Canal or Braces) take multiple visits over several weeks. Dentists need to track exactly how far along a patient is in their overall treatment.
*   **User workflow:** The dentist examines a patient and says, "You need a Root Canal." The dentist clicks "Start Root Canal Journey" on the patient's profile.
*   **Data involved:** The name of the procedure, the total estimated cost, and whether the journey is currently active, stalled, or finished.
*   **Risks:** A patient gets halfway through a journey (e.g., they get a temporary crown) and never comes back, leaving the clinic with unpaid work and an empty chair. (DentalFlow tracks this heavily to prevent it).

### 6. Treatment Stages
*   **Purpose:** The individual steps within a Journey.
*   **Why it exists:** A "Root Canal" Journey is actually broken down into stages: Stage 1 (Cleaning the nerve), Stage 2 (Placing the crown). 
*   **User workflow:** After finishing the day's work, the dentist checks off "Stage 1 Completed." The system then knows exactly what needs to happen next time.
*   **Data involved:** The specific task done that day, doctor's notes, and the status (Pending vs. Completed).
*   **Risks:** The dentist forgets to check off a completed stage, making the system think the patient is behind schedule.

### 7. Appointments
*   **Purpose:** The clinic's daily calendar.
*   **Why it exists:** To organize when patients are coming in, and to ensure they show up.
*   **User workflow:** The receptionist selects an open time slot on the calendar and links it to a patient's next Treatment Stage.
*   **Data involved:** Dates, times, the specific doctor assigned, and whether the patient showed up or canceled.
*   **Risks:** Patients forgetting their appointments (No-Shows), which costs the clinic money.

### 8. Follow Ups
*   **Purpose:** A digital "To-Do" list for the receptionist to call patients.
*   **Why it exists:** Even with automated WhatsApp messages, some patients ignore texts. If an automated reminder fails, the system tells a human to call them.
*   **User workflow:** The receptionist checks the "Follow Up" tab every morning, sees a list of patients who haven't booked their next visit, and calls them one by one.
*   **Data involved:** Lists of stalled patients, notes from phone calls, and dates of the last contact.
*   **Risks:** Staff ignoring the Follow Up list, leading to lost patients and lost revenue.

### 9. Revenue Tracking
*   **Purpose:** The clinic's financial dashboard.
*   **Why it exists:** To tell the dentist exactly how much money they made today, how much they are owed, and where the money is coming from.
*   **User workflow:** The Head Dentist opens the dashboard at the end of the month to see a graph of total revenue collected versus money still owed by patients.
*   **Data involved:** Total costs of treatments, amounts paid, and outstanding balances.
*   **Risks:** The system looking overly complicated. Dentists want to see their money simply and quickly.

### 10. Payments (Invoices & QR Codes)
*   **Purpose:** The checkout register.
*   **Why it exists:** To formally request money from patients and give them a receipt.
*   **User workflow:** After a stage is done, the receptionist generates a digital invoice. The system pops up a UPI QR code on the screen. The patient scans it with their phone (Google Pay/PhonePe) and pays instantly.
*   **Data involved:** Formal Invoice numbers, tax amounts, line items (e.g., "X-Ray: ₹500"), and payment timestamps.
*   **Risks:** The clinic forgets to log a cash payment in the system, making it look like the patient still owes money when they don't.

### 11. WhatsApp (The Communication Engine)
*   **Purpose:** The automated voice of the clinic.
*   **Why it exists:** This is DentalFlow's "secret sauce." Instead of staff manually texting people, the system automatically messages patients via WhatsApp (which everyone uses and checks constantly).
*   **User workflow:** This happens invisibly in the background. When an appointment is booked, the system instantly WhatsApps a confirmation. The day before the visit, it WhatsApps a reminder. 6 months later, it WhatsApps a "Time for a checkup" message.
*   **Data involved:** Pre-approved message templates, delivery receipts (Sent, Delivered, Read), and patient replies.
*   **Risks:** WhatsApp (owned by Meta) has strict rules. If a clinic spams patients, Meta could block their phone number. Also, if Meta's servers go down, the reminders stop sending.

### 12. Analytics
*   **Purpose:** The clinic's report card.
*   **Why it exists:** To show the dentist the big picture. Are they growing? Are patients completing their treatments? 
*   **User workflow:** The dentist views charts showing their "Treatment Completion Rate" (how many people actually finish their whole Root Canal) and daily revenue trends.
*   **Data involved:** Aggregated numbers, percentages, and visual charts.
*   **Risks:** If the underlying data (like checked-off stages or logged payments) is wrong, the analytics will be useless and misleading.

### 13. Subscription Management (SaaS Billing)
*   **Purpose:** How you (the founder) make money.
*   **Why it exists:** DentalFlow is a paid service. Clinics must pay a monthly or yearly fee to use it.
*   **User workflow:** The dentist enters their credit card or sets up an automatic UPI mandate. Every month, Razorpay automatically charges them. If their card fails, DentalFlow automatically locks their account until they pay.
*   **Data involved:** Razorpay subscription IDs, billing cycles, and active/suspended status flags.
*   **Risks:** If the payment gateway goes down, you can't collect your monthly fees. If a clinic's card fails and they get locked out during a busy workday, they will be very frustrated.
