# Wireframe: Appointments & Follow-Ups

This section outlines the UI for scheduling the patient's next visit and tracking the automated WhatsApp follow-ups that reduce no-shows.

---

## 1. Appointments Calendar (Desktop)

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Appointments         [<] Today [>] [+ Appt]   |
|  [ ] Patients              |  --------------------------------------------  |
|  [x] Appointments          |                                                |
|  [ ] Active Journeys       |    Time    | Dr. Shenoy (Chair 1)              |
|  [ ] Follow-Ups            |    --------|---------------------------------  |
|  [ ] Revenue Recovery      |    09:00   |                                   |
|                            |    09:30   | [Rahul S. - Root Canal (BMP)]     |
|  [ ] Analytics             |    10:00   |                                   |
|  [ ] Settings              |    10:30   | [Priya K. - Braces Adjust   ]     |
|                            |    11:00   |                                   |
|                            |                                                |
+----------------------------+------------------------------------------------+
```

---

## 2. Follow-Ups / Recall Tracker (Desktop)

*   This screen is crucial for the "Treatment Completion Rate" metric. It shows the status of the automated WhatsApp nudges.

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Follow-Ups & Recalls                          |
|  [ ] Patients              |  --------------------------------------------  |
|  [ ] Appointments          |  [ WhatsApp Delivery Logs ]  [ Pending Recalls]|
|  [ ] Active Journeys       |                                                |
|  [x] Follow-Ups            |  Patient       Trigger Type    Status          |
|  [ ] Revenue Recovery      |  --------------------------------------------  |
|                            |  Rahul Sharma  Post-Op Nudge   [✓ Delivered]   |
|  [ ] Analytics             |  Priya Kumar   Missed Appt     [× Failed]      |
|  [ ] Settings              |  Amit Patel    Recall (6 Mo)   [⏳ Pending]    |
|                            |                                                |
+----------------------------+------------------------------------------------+
```

---

## 3. Appointments & Follow-Ups (Mobile)

*   **Changes:** The calendar grid converts into an agenda list. The Follow-ups log becomes a card-based list.

```text
+--------------------------------------+
| [Menu]  Appointments        [+ Appt] |
+--------------------------------------+
| [<] Today, 20 May [>]                |
|                                      |
| 09:30 AM                             |
| +----------------------------------+ |
| | Rahul Sharma (Root Canal)        | |
| | Status: Checked In               | |
| +----------------------------------+ |
|                                      |
| 10:30 AM                             |
| +----------------------------------+ |
| | Priya Kumar (Braces)             | |
| | Status: Confirmed                | |
| +----------------------------------+ |
|                                      |
+--------------------------------------+
| [Dash]  [Pts]  [Appts]  [FUPs] [Set] |
+--------------------------------------+

+--------------------------------------+
| [Menu]  Follow-Ups                   |
+--------------------------------------+
| [WhatsApp Logs]   [Pending Recalls]  |
|                                      |
| +----------------------------------+ |
| | Rahul S. | Post-Op Nudge         | |
| | Status: ✓ Delivered (10:15 AM)   | |
| +----------------------------------+ |
|                                      |
| +----------------------------------+ |
| | Priya K. | Missed Appt           | |
| | Status: × Failed (Invalid Num)   | |
| +----------------------------------+ |
|                                      |
+--------------------------------------+
| [Dash]  [Pts]  [Appts]  [FUPs] [Set] |
+--------------------------------------+
```
