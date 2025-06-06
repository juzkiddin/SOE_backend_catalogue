# ... (existing documentation for createsession) ...

---

### 2. Check or Expire a Session

This endpoint is used to check the status of a specific session. If the session is found to be older than the configured expiry time (8 hours), this call will update its status to "Expired" and "NotCompleted". It's useful for polling or for cases where a user re-enters the application and a session check is needed without necessarily creating a new one.

-   **Method:** `POST`
-   **Path:** `/session/sessionstatus`
-   **Description:** Checks the status of a given session and expires it if necessary.

#### Request Body

```json
{
  "restaurantId": "tastyspoon",
  "sessionId": "82d9da73-9760-41da-b56e-df07077e72b6",
  "tableId": "table01"
}
```

#### Success Response (HTTP 200 OK)

Returns the current (or newly updated) status of the session.

```json
{
  "sessionStatus": "Active" 
}
```
*or*
```json
{
  "sessionStatus": "Expired"
}
```
*or*
```json
{
  "sessionStatus": "Completed"
}
```

#### Error Responses

-   **HTTP 404 Not Found:** The provided `sessionId` does not exist.
-   **HTTP 400 Bad Request:** The `restaurantId` or `tableId` in the request do not match the session record in the database.

#### Example `cURL` Request

```bash
curl -X POST https://catalogue.snapordereat.in/session/sessionstatus \
-H "Content-Type: application/json" \
-d '{
  "restaurantId": "tastyspoon",
  "sessionId": "82d9da73-9760-41da-b56e-df07077e72b6",
  "tableId": "table01"
}'
```

---

### 3. Confirm a Payment

This endpoint is called after a user has successfully completed the payment process...
// ... (rest of existing documentation for paymentconfirm) ... 