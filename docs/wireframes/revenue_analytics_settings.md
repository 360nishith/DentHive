# Wireframe: Revenue, Analytics, & Settings

This section documents the clinic management screens: tracking pending balances (Revenue Recovery), analyzing the core metric (Treatment Completion Rate), and configuring the clinic's SaaS settings.

---

## 1. Revenue Recovery (Desktop)

*   This screen aggregates all `TreatmentJourneys` where `amountPaid < totalCost` and the status is active or completed.

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Revenue Recovery                              |
|  [ ] Patients              |  --------------------------------------------  |
|  [ ] Appointments          |  Total Outstanding: ₹ 45,000                   |
|  [ ] Active Journeys       |                                                |
|  [ ] Follow-Ups            |  Patient       Treatment     Due Amount        |
|  [x] Revenue Recovery      |  --------------------------------------------  |
|                            |  Rahul Sharma  Root Canal    ₹ 5,000   [Pay]   |
|  [ ] Analytics             |  Anil Desai    Implants      ₹ 40,000  [Pay]   |
|  [ ] Settings              |                                                |
+----------------------------+------------------------------------------------+
```

---

## 2. Analytics (Desktop)

*   This screen visualizes the primary success metric: TCR (Treatment Completion Rate).

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Analytics                                     |
|  [ ] Patients              |  --------------------------------------------  |
|  [ ] Appointments          |  [ Last 30 Days v ]                            |
|  [ ] Active Journeys       |                                                |
|  [ ] Follow-Ups            |  +------------------------------------------+  |
|  [ ] Revenue Recovery      |  | Treatment Completion Rate (TCR)          |  |
|                            |  |                                          |  |
|  [x] Analytics             |  |   100% |        [||]                     |  |
|  [ ] Settings              |  |    80% |   [||] [||] [||]                |  |
|                            |  |    60% |   [||] [||] [||]                |  |
|                            |  |    40% |   [||] [||] [||]                |  |
|                            |  |    20% |   [||] [||] [||]                |  |
|                            |  |      0 +----------------------------     |  |
|                            |  |          Week 1  Week 2  Week 3          |  |
|                            |  +------------------------------------------+  |
+----------------------------+------------------------------------------------+
```

---

## 3. Settings (Desktop)

*   Used by the `DENTIST` (Owner) to configure clinic details and the UPI VPA for the dynamic QR codes.

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Settings                                      |
|  [ ] Patients              |  --------------------------------------------  |
|  [ ] Appointments          |  [ Clinic Info ] [ Staff ] [ Billing (SaaS) ]  |
|  [ ] Active Journeys       |                                                |
|  [ ] Follow-Ups            |  Clinic Name                                   |
|  [ ] Revenue Recovery      |  [ Shenoy Dental Clinic               ]        |
|                            |                                                |
|  [ ] Analytics             |  UPI VPA (For Payment Collection QR)           |
|  [x] Settings              |  [ shenoy@okicici                     ]        |
|                            |                                                |
|                            |  [ Save Changes ]                              |
+----------------------------+------------------------------------------------+
```

---

## 4. Mobile Views

*   **Changes:** Tables become stacked cards. Charts become scrollable horizontally. Navigation moves to the bottom.

```text
+--------------------------------------+
| [Menu]  Revenue Recovery             |
+--------------------------------------+
| Total Outstanding: ₹ 45,000          |
|                                      |
| +----------------------------------+ |
| | Rahul Sharma (Root Canal)        | |
| | Due: ₹ 5,000               [Pay] | |
| +----------------------------------+ |
|                                      |
| +----------------------------------+ |
| | Anil Desai (Implants)            | |
| | Due: ₹ 40,000              [Pay] | |
| +----------------------------------+ |
|                                      |
+--------------------------------------+
| [Dash]  [Pts]  [Appts]  [FUPs] [Set] |
+--------------------------------------+

+--------------------------------------+
| [Menu]  Settings                     |
+--------------------------------------+
| [Clinic Info] [Staff] [Billing]      |
|                                      |
| Clinic Name                          |
| [ Shenoy Dental Clinic         ]     |
|                                      |
| UPI VPA                              |
| [ shenoy@okicici               ]     |
|                                      |
| [ Save Changes ]                     |
|                                      |
+--------------------------------------+
| [Dash]  [Pts]  [Appts]  [FUPs] [Set] |
+--------------------------------------+
```
