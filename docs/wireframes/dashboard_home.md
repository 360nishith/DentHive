# Wireframe: Dashboard Home

The Dashboard Home is the default view upon logging in. It prioritizes the most actionable metrics for a solo dentist: Today's schedule, Stalled Journeys (patients dropping off), and top-level KPI metrics.

---

## 1. Desktop View (1024px+)

```text
+-----------------------------------------------------------------------------+
|  DentalFlow                |  Search Patients...          [Bell] [Profile]  |
+----------------------------+------------------------------------------------+
|                            |                                                |
|  [ ] Dashboard             |  Hello, Dr. Shenoy                             |
|  [ ] Patients              |  Here's what's happening today.                |
|  [ ] Appointments          |                                                |
|  [ ] Active Journeys       |  +----------------+ +----------------+ +----+  |
|  [ ] Follow-Ups (3)        |  | TCR (Month)    | | Revenue Today  | | +  |  |
|  [ ] Revenue Recovery      |  | 82%            | | ₹ 15,500       | |New |  |
|                            |  | ^ +4% vs last  | | 3 Payments     | |Pat |  |
|  [ ] Analytics             |  +----------------+ +----------------+ +----+  |
|  [ ] Settings              |                                                |
|                            |  +------------------------------------------+  |
|                            |  | ⚠️ STALLED JOURNEYS (Requires Action)      |  |
|                            |  +------------------------------------------+  |
|                            |  | Rahul S. | Root Canal | 14 Days idle [!] |  |
|                            |  | Priya K. | Braces     | Missed Appt  [!] |  |
|                            |  +------------------------------------------+  |
|                            |                                                |
|                            |  +------------------------------------------+  |
|                            |  | 📅 TODAY'S APPOINTMENTS                    |  |
|                            |  +------------------------------------------+  |
|                            |  | 10:00 AM | Rajesh | Extraction    [Start]|  |
|                            |  | 11:30 AM | Sunita | Consultation  [Start]|  |
|                            |  +------------------------------------------+  |
+----------------------------+------------------------------------------------+
```

---

## 2. Tablet View (768px - 1023px)

*   **Changes:** Sidebar collapses into a slim icon-only bar. The KPI cards shrink slightly.

```text
+-----------------------------------------------------------------------------+
|  [Logo]                    |  Search Patients...          [Bell] [Profile]  |
+----+-----------------------+------------------------------------------------+
|    | Hello, Dr. Shenoy                                                      |
| [D]| +--------------+ +--------------+ +---------------+                    |
| [P]| | TCR: 82%     | | Rev: ₹15,500 | | [+] New Pat   |                    |
| [A]| +--------------+ +--------------+ +---------------+                    |
| [J]|                                                                        |
| [F]| ⚠️ STALLED JOURNEYS (Requires Action)                                    |
| [R]| +--------------------------------------------------------------------+ |
|    | | Rahul S. | Root Canal | 14 Days idle                           [!] | |
| [S]| +--------------------------------------------------------------------+ |
| [⚙]|                                                                        |
|    | 📅 TODAY'S APPOINTMENTS                                                |
|    | +--------------------------------------------------------------------+ |
|    | | 10:00 AM | Rajesh | Extraction                             [Start] | |
|    | +--------------------------------------------------------------------+ |
+----+------------------------------------------------------------------------+
```

---

## 3. Mobile View (320px - 767px)

*   **Changes:** The Sidebar disappears entirely, replaced by a Bottom Navigation Bar. KPI cards stack vertically. Data tables become list cards.

```text
+--------------------------------------+
| [Menu]  DentalFlow         [Profile] |
+--------------------------------------+
| Hello, Dr. Shenoy                    |
|                                      |
| +----------------------------------+ |
| | [+] QUICK ACTION: New Patient    | |
| +----------------------------------+ |
|                                      |
| +----------------------------------+ |
| | TCR: 82%      | Rev: ₹ 15,500    | |
| +----------------------------------+ |
|                                      |
| ⚠️ STALLED JOURNEYS                  |
| +----------------------------------+ |
| | Rahul S. (Root Canal)            | |
| | 14 Days idle                 [!] | |
| +----------------------------------+ |
|                                      |
| 📅 TODAY'S APPOINTMENTS              |
| +----------------------------------+ |
| | 10:00 AM - Rajesh                | |
| | Extraction               [Start] | |
| +----------------------------------+ |
|                                      |
+--------------------------------------+
| [Dash]  [Pts]  [Appts]  [FUPs] [Set] |
+--------------------------------------+
```
