# Android SMS Gateway setup

EduScan sends real SMS messages through a dedicated Android phone running [SMS Gateway for Android](https://github.com/capcom6/android-sms-gateway). Local Server mode works without internet access: the EduScan laptop calls the phone over the same local Wi-Fi or hotspot, and the phone sends the message through its SIM and cellular signal.

## What you need

- a school-controlled Android phone and active SIM with SMS load or an appropriate plan;
- the official SMS Gateway for Android application;
- SMS and notification permissions granted to the application;
- the phone and EduScan laptop connected to the same protected local network; and
- the phone's Local Server URL, username, and password.

Wi-Fi provides the laptop-to-phone connection. Internet service is not required, but the SIM must have cellular service to deliver SMS.

## Configure the phone

1. Install the current official application release and open it.
2. Grant SMS permission and any phone/notification permission requested for sending and delivery status.
3. Open the Local Server configuration, enable the server, and create a long unique username and password.
4. Note the address displayed by the application, normally similar to `http://192.168.1.100:8080`.
5. Disable battery optimization for the gateway application, keep the phone charging, and prevent Android from putting the application to sleep.
6. Give the phone a reserved Wi-Fi address in the router when possible. If the address changes, update EduScan before sending.

Do not append `/message` to the URL entered in EduScan. The backend adds that endpoint itself. Do not expose the phone's server port to the public internet.

## Configure EduScan

1. Sign in as an administrator.
2. Open **System setup & governance**, then **Android SMS**.
3. Enter the Local Server base URL, username, password, and the school contact text.
4. Review the four approved templates and select **Save gateway & templates**.
5. Select **Check local connection**. This checks only whether the phone's server port is reachable; it does not send an SMS.
6. Enter a consenting test recipient in `+639XXXXXXXXX` format and select **Send real test SMS**.
7. Confirm receipt on the test phone and inspect the delivery outbox. `accepted` means the Android server accepted the request; `delivered` is used only when the gateway returns a delivery report.
8. Only after the test succeeds, enable real gateway dispatch and save again.

EduScan sends an HTTP Basic-authenticated `POST` request to the phone's `/message` endpoint with the gateway's documented `textMessage`, `phoneNumbers`, and delivery-report fields.

## Delivery operations

The Oversight workspace distinguishes `queued`, `accepted`, `processed`, `sent`, `delivered`, `failed`, `exhausted`, and `cancelled`. Authorized administrators/records officers can reconcile gateway status, requeue a failed/exhausted message after reviewing the cause, cancel an obsolete queued message, and export the retained delivery log as CSV. Older Local Server versions may accept messages without exposing later status/cancellation endpoints; EduScan preserves `accepted` rather than falsely claiming delivery in that case.

## No-school-Wi-Fi demonstration

Use a third device as a private hotspot when available, then connect both the EduScan laptop and gateway phone to it. If the gateway phone itself provides the hotspot, verify that its Android version permits hotspot clients to reach services running on the host phone; some devices isolate them. The scanner, database, LBPH recognition, reports, and local gateway connection remain offline-capable.

## Troubleshooting

- **Phone unreachable:** confirm both devices are on the same network, Local Server is running, the URL and port match the phone, Windows identifies the network correctly, and the firewall/network does not isolate clients.
- **Reachable but test returns 401/403:** save the exact Local Server username and password again.
- **Test accepted but no SMS arrives:** check SIM load, signal, default SIM selection, Android SMS permission, carrier restrictions, and the gateway app's message history.
- **It worked and later stopped:** the phone's IP probably changed or Android stopped the app. Reserve its address and recheck battery optimization.
- **OBS and scanner camera conflict:** unrelated to SMS; close any application holding the webcam or choose a different camera in OBS.

For a real school deployment, document the approved message purpose, recipient source, error-reconciliation procedure, phone custody, SIM ownership, retention period, and authorized staff before enabling automatic notices.
