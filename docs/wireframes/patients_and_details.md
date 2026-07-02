# Wireframe: Patients & Patient Details

This section outlines the UI for searching the patient registry and viewing an individual patient's comprehensive profile.

---

## 1. Patients Directory (Desktop)

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Patients                             [+ Add]  |
|  [x] Patients              |  --------------------------------------------  |
|  [ ] Appointments          |  [Search by Name or Phone]    [Filter: All v]  |
|  [ ] Active Journeys       |                                                |
|  [ ] Follow-Ups            |  Name          Phone       Last Visit          |
|  [ ] Revenue Recovery      |  --------------------------------------------  |
|                            |  Rahul Sharma  9876543210  12 May 2024  [>]  |
|  [ ] Analytics             |  Priya Kumar   9123456789  05 May 2024  [>]  |
|  [ ] Settings              |  Amit Patel    9988776655  --           [>]  |
|                            |                                                |
|                            |  < Prev  [1] [2] [3]  Next >                   |
+----------------------------+------------------------------------------------+
```

---

## 2. Patient Details (Desktop)

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |  < Back to Patients                            |
|  [ ] Dashboard             |  Rahul Sharma                                  |
|  [x] Patients              |  +91 9876543210 | Age: 34 | WhatsApp: [Yes]    |
|  [ ] Appointments          |  --------------------------------------------  |
|  [ ] Active Journeys       |                                                |
|  [ ] Follow-Ups            |  [ Active Journeys ] [ Files & X-Rays ]        |
|  [ ] Revenue Recovery      |                                                |
|                            |  +------------------------------------------+  |
|  [ ] Analytics             |  | Root Canal Treatment          [Complete] |  |
|  [ ] Settings              |  | Started: 12 May 2024                     |  |
|                            |  | Status: ACTIVE                           |  |
|                            |  | Cost: ₹10,000 | Paid: ₹5,000 | Due: ₹5K  |  |
|                            |  |                                          |  |
|                            |  | Stages:                                  |  |
|                            |  | [x] Access Opening                       |  |
|                            |  | [ ] BMP (Current)            [Mark Done] |  |
|                            |  | [ ] Obturation                           |  |
|                            |  | [ ] Crown                                |  |
|                            |  +------------------------------------------+  |
|                            |                                                |
|                            |                            [+ New Journey ]  |
+----------------------------+------------------------------------------------+
```

---

## 3. Patient Details (Tablet)

*   **Changes:** Sidebar collapses. The Journey card takes full width.

```text
+-----------------------------------------------------------------------------+
|  [Logo]                    |  Search Patients...          [Bell] [Profile]  |
+----+-----------------------+------------------------------------------------+
|    | < Back                                                                 |
| [D]| Rahul Sharma                                                           |
| [P]| +91 9876543210 | WhatsApp: [Yes]                                       |
| [A]| ---------------------------------------------------------------------- |
| [J]| [ Active Journeys ] [ Files ]                                          |
| [F]|                                                                        |
| [R]| +--------------------------------------------------------------------+ |
|    | | Root Canal Treatment                                  [Complete]   | |
| [S]| | Status: ACTIVE  | Due: ₹5,000                                      | |
| [⚙]| | Stages: [x] Access | [ ] BMP [Done] | [ ] Obturation | [ ] Crown   | |
|    | +--------------------------------------------------------------------+ |
+----+------------------------------------------------------------------------+
```

---

## 4. Patient Details (Mobile)

*   **Changes:** Navigation moves to the bottom. Horizontal tabs convert to a stacked or scrollable list. The Journey card stacks vertically for readability.

```text
+--------------------------------------+
| [Back] Rahul Sharma                  |
+--------------------------------------+
| +91 9876543210                       |
| WhatsApp: [Yes]                      |
|                                      |
| [Journeys] [Files] [History]         |
|                                      |
| +----------------------------------+ |
| | Root Canal Treatment             | |
| | ACTIVE | Due: ₹5,000             | |
| | -------------------------------- | |
| | [x] Access Opening               | |
| | [ ] BMP (Current)    [Mark Done] | |
| | [ ] Obturation                   | |
| | [ ] Crown                        | |
| +----------------------------------+ |
|                                      |
| [+ New Journey]                      |
|                                      |
+--------------------------------------+
| [Dash]  [Pts]  [Appts]  [FUPs] [Set] |
+--------------------------------------+
```
