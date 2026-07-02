# Wireframe: Treatments & Journeys (Modals/Sheets)

This section maps out the critical UX flows for initiating and executing a Treatment Journey using Shadcn Sheets and Dialogs overlaying the main Patient Details screen.

---

## 1. Start Journey (Desktop & Tablet Slide-out Sheet)

*   **Trigger:** Clicking `[+ New Journey]` on the Patient Profile.
*   **Action:** A `Sheet` slides out from the right edge of the screen over the darkened background. On Mobile, it slides up from the bottom or takes over the full screen.

```text
+-----------------------------------------------------------------------------+
|                                                   +-----------------------+ |
|  [Background Dimmed]                              | Start Journey      [X]| |
|                                                   | --------------------- | |
|                                                   | Patient: Rahul Sharma | |
|                                                   |                       | |
|                                                   | Select Template:      | |
|                                                   | [ Root Canal      [v]]| |
|                                                   |                       | |
|                                                   | Estimated Cost:       | |
|                                                   | [ ₹ 10,000           ]| |
|                                                   |                       | |
|                                                   | Stages that will be   | |
|                                                   | created:              | |
|                                                   | 1. Access Opening     | |
|                                                   | 2. BMP                | |
|                                                   | 3. Obturation         | |
|                                                   | 4. Crown              | |
|                                                   |                       | |
|                                                   | [Cancel]      [Start] | |
|                                                   +-----------------------+ |
+-----------------------------------------------------------------------------+
```

---

## 2. Complete Stage & Collect Payment (Desktop & Tablet Dialog)

*   **Trigger:** Clicking `[Mark Done]` on the Active Journey Card.
*   **Action:** A centered `Dialog` modal pops up. This combines clinical completion with revenue recovery in one seamless flow.

```text
+-----------------------------------------------------------------------------+
|                                                                             |
|            +-----------------------------------------------------+          |
|            | Complete Stage: BMP                                 |          |
|            | --------------------------------------------------- |          |
|            | Journey: Root Canal | Patient: Rahul Sharma         |          |
|            |                                                     |          |
|            | Mark this clinical stage as complete? This will     |          |
|            | trigger the post-op WhatsApp instructions.          |          |
|            |                                                     |          |
|            | [ ] Just mark as complete (Skip Payment)            |          |
|            |                                                     |          |
|            | [x] Collect Payment Now                             |          |
|            |                                                     |          |
|            | Amount to collect (Due: ₹5,000):                    |          |
|            | [ ₹ 2,000                         ]                 |          |
|            |                                                     |          |
|            | Method: (o) UPI   ( ) Cash   ( ) Card               |          |
|            |                                                     |          |
|            |      +--------+    Scan this QR code to             |          |
|            |      |  [QR]  |    pay ₹2,000 via UPI.              |          |
|            |      +--------+                                     |          |
|            |                                                     |          |
|            | [Cancel]               [Confirm Completion & Pay]   |          |
|            +-----------------------------------------------------+          |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 3. Complete Stage (Mobile View)

*   **Changes:** The Modal takes up near full width. The QR code shrinks to fit or forces vertical scrolling.

```text
+--------------------------------------+
| Complete Stage: BMP              [X] |
+--------------------------------------+
| Patient: Rahul Sharma                |
|                                      |
| Mark stage complete? (Will trigger   |
| WhatsApp automation)                 |
|                                      |
| [ ] Skip Payment                     |
| [x] Collect Payment Now              |
|                                      |
| Amount:                              |
| [ ₹ 2,000                          ] |
|                                      |
| Method: [UPI v]                      |
|                                      |
|          +------+                    |
|          | [QR] |                    |
|          +------+                    |
|                                      |
| [Cancel]          [Confirm & Pay]    |
+--------------------------------------+
```
